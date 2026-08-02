const { OpenAI } = require("openai");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const puppeteer = require("puppeteer");

// Helper function to get OpenAI/Groq client with key validation
function getAiClient() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("GROQ_API_KEY is not defined in the environment variables.");
    }
    return new OpenAI({
        apiKey,
        baseURL: "https://api.groq.com/openai/v1",
    });
}

// ── Zod Schemas for Parallel Generation ────────────────────────────────────────

const overviewSchema = z.object({
    title: z.string().describe("The target job title analyzed"),
    matchScore: z.number().describe("Overall match score between 0 and 100"),
    matchScoreDetails: z.object({
        overallScore: z.number().describe("Same as matchScore"),
        technicalSkills: z.number().describe("Score for technical capabilities matching (0-100)"),
        softSkills: z.number().describe("Score for behavioral/soft skills matching (0-100)"),
        resumeQuality: z.number().describe("Score for resume layout, clarity and impact (0-100)"),
        keywordMatch: z.number().describe("Score for matching resume keywords to JD (0-100)"),
        educationMatch: z.number().describe("Score for academic and certification match (0-100)"),
        experienceMatch: z.number().describe("Score for career duration and roles match (0-100)"),
        projectsMatch: z.number().describe("Score for relevance of projects listed (0-100)")
    }).describe("Granular match analysis parameters"),
    atsAnalysis: z.string().describe("Detailed professional ATS summary analyzing fit, resume parsed format, and recommendations"),
    strengths: z.array(z.string()).describe("List of 3-5 major professional strengths of the candidate relative to the JD"),
    weaknesses: z.array(z.string()).describe("List of 3-5 key gaps or weaknesses of the candidate relative to the JD"),
    recommendations: z.array(z.string()).describe("List of 3-5 actionable recommendations to improve the profile"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The name of the missing/weak skill"),
        severity: z.enum([ "low", "medium", "high" ]).describe("Gap severity"),
        whyItMatters: z.string().describe("Why this skill is critical for the target role"),
        learningResources: z.array(z.string()).describe("2-3 high-quality learning links, docs, or course names"),
        estimatedTime: z.string().describe("Time needed to learn this skill, e.g. '10 hours', '2 weeks'"),
        priority: z.enum([ "low", "medium", "high" ]).describe("Action priority")
    })).describe("List of identified skill gaps")
});

const questionsSchema = z.object({
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical interview question"),
        intention: z.string().describe("Why the interviewer asks this question"),
        answer: z.string().describe("Ideal direct explanation or code snippet structure"),
        difficulty: z.enum([ "easy", "medium", "hard" ]).describe("Question difficulty"),
        commonMistakes: z.string().describe("Common pitfalls candidates make when answering"),
        followUpQuestions: z.array(z.string()).describe("2-3 natural follow-up questions an interviewer might ask next")
    })).describe("Exactly 10 to 15 technical questions covering easy, medium, and hard difficulty"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The behavioral scenario question"),
        intention: z.string().describe("Intention behind the behavioral question"),
        answer: z.string().describe("Short answer approach advice"),
        tips: z.string().describe("Tips for structure (STAR format guidelines)"),
        sampleAnswer: z.string().describe("A full example response using the STAR method (Situation, Task, Action, Result)")
    })).describe("Exactly 10 to 15 behavioral questions")
});

const roadmapSchema = z.object({
    preparationPlan: z.array(z.object({
        day: z.number().describe("Day number from 1 to 30"),
        focus: z.string().describe("Focus area, e.g. DSA, System Design, Mock Interview"),
        topic: z.string().describe("Specific topic of the day"),
        theory: z.string().describe("Theoretical concepts to read and understand"),
        practiceProblems: z.array(z.string()).describe("2-3 specific practice problem titles or descriptions"),
        interviewQuestions: z.array(z.string()).describe("2-3 common interview questions on this topic"),
        resources: z.array(z.string()).describe("Online resources or search terms to learn this"),
        estimatedTime: z.string().describe("Time required, e.g. '3 hours'"),
        category: z.enum([ "DSA", "OOP", "DBMS", "OS", "Computer Networks", "System Design", "Projects", "HR Interview", "Mock Interviews" ]).describe("Syllabus stream category"),
        tasks: z.array(z.string()).describe("Step-by-step checkboxes list of tasks")
    })).describe("Exactly 30 day-by-day plan entries")
});

const resumePdfSchema = z.object({
    html: z.string().describe("ATS-optimized premium HTML code of the resume")
});

// Helper function to call Groq with retry and JSON validation
async function callGroqWithJsonRetry(systemPrompt, userPrompt, schema, retries = 3) {
    const client = getAiClient();
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    
    let lastError = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const completion = await client.chat.completions.create({
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0.3,
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) {
                throw new Error("Empty response received from Groq API.");
            }

            let parsedData;
            try {
                parsedData = JSON.parse(content);
            } catch (parseErr) {
                throw new Error(`JSON parsing failed: ${parseErr.message}`);
            }

            const validationResult = schema.safeParse(parsedData);
            if (!validationResult.success) {
                throw new Error(`Schema validation failed: ${validationResult.error.message}`);
            }

            return validationResult.data;
        } catch (error) {
            console.error(`Groq API Attempt ${attempt} failed:`, error.message);
            lastError = error;
            if (attempt < retries) {
                await new Promise((resolve) => setTimeout(resolve, 1500));
            }
        }
    }
    throw new Error(`Failed after ${retries} attempts. Last error: ${lastError.message}`);
}

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    const candidateContext = `Candidate Resume:\n${resume || "Not provided"}\n\nCandidate Self-Description:\n${selfDescription || "Not provided"}`;
    const targetJD = `Target Job Description:\n${jobDescription}`;

    // Prompt 1: Overview & Match Details
    const overviewSystem = `You are a senior ATS Match analyst. Analyze the resume/self-description against the target job description.
    Generate matching statistics (0-100) and identify missing skill gaps.
    Make sure 'matchScore' matches 'matchScoreDetails.overallScore'.
    Provide a detailed professional 'atsAnalysis' summary (minimum 3 paragraphs), 'strengths' list, 'weaknesses' list, and actionable 'recommendations' list.`;
    const overviewUser = `${candidateContext}\n\n${targetJD}\n\nProvide the response in this JSON schema format:\n${JSON.stringify(zodToJsonSchema(overviewSchema))}`;

    // Prompt 2: Technical & Behavioral Questions
    const questionsSystem = `You are an elite technical interviewer. Generate exactly 10 to 15 high-quality technical questions (mix of easy, medium, and hard difficulty) and exactly 10 to 15 behavioral questions customized to the candidate's profile and the target job description. Provide intentions, ideal answers, common mistakes, and follow-up questions. Behavioral answers must use structural STAR guidelines.`;
    const questionsUser = `${candidateContext}\n\n${targetJD}\n\nProvide the response in this JSON schema format:\n${JSON.stringify(zodToJsonSchema(questionsSchema))}`;

    // Prompt 3: 30-Day Preparation Roadmap
    const roadmapSystem = `You are a computer science mentor. Generate a detailed 30-day study plan categorizing each day's study tasks (DSA, OOP, DBMS, OS, Computer Networks, System Design, Projects, HR Interview, Mock Interviews) to fill the candidate's gaps for the target job description. Every day MUST have topic, theory, practice problems, interview questions, resources, estimatedTime, category, and tasks. Generate exactly 30 days.`;
    const roadmapUser = `${candidateContext}\n\n${targetJD}\n\nProvide the response in this JSON schema format:\n${JSON.stringify(zodToJsonSchema(roadmapSchema))}`;

    try {
        console.log("Generating report components in parallel...");
        const [overviewResult, questionsResult, roadmapResult] = await Promise.all([
            callGroqWithJsonRetry(overviewSystem, overviewUser, overviewSchema),
            callGroqWithJsonRetry(questionsSystem, questionsUser, questionsSchema),
            callGroqWithJsonRetry(roadmapSystem, roadmapUser, roadmapSchema)
        ]);

        return {
            title: overviewResult.title,
            matchScore: overviewResult.matchScore,
            matchScoreDetails: overviewResult.matchScoreDetails,
            atsAnalysis: overviewResult.atsAnalysis,
            strengths: overviewResult.strengths,
            weaknesses: overviewResult.weaknesses,
            recommendations: overviewResult.recommendations,
            skillGaps: overviewResult.skillGaps,
            technicalQuestions: questionsResult.technicalQuestions,
            behavioralQuestions: questionsResult.behavioralQuestions,
            preparationPlan: roadmapResult.preparationPlan
        };
    } catch (error) {
        console.error("Parallel AI Generation error:", error);
        throw new Error(`Failed to generate comprehensive report: ${error.message}`);
    }
}

const PDFDocument = require('pdfkit');

async function generatePdfFallback(htmlContent) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });
        doc.on('error', (err) => {
            reject(err);
        });

        // Strip HTML tags and normalize text
        let text = htmlContent
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style blocks
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script blocks
            .replace(/<[^>]+>/g, '\n') // Replace tag closures/tags with newlines
            .replace(/\n\s*\n+/g, '\n\n') // Collapse multiple newlines
            .trim();

        // Decode basic HTML entities
        text = text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

        // Write text to PDF document
        doc.fontSize(10).fillColor('#333333');
        
        const lines = text.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            
            // Check if it looks like a heading/section header
            if (trimmed.toUpperCase() === trimmed && trimmed.length < 50 && isNaN(trimmed)) {
                doc.moveDown(0.5);
                doc.fontSize(12).fillColor('#1e293b').text(trimmed, { stroke: false, bold: true });
                doc.fontSize(10).fillColor('#333333');
                doc.moveDown(0.2);
            } else if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
                doc.text(trimmed, { indent: 15 });
            } else {
                doc.text(trimmed);
            }
        }

        doc.end();
    });
}

async function generatePdfFromHtml(htmlContent) {
    try {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        try {
            const page = await browser.newPage();
            await page.setContent(htmlContent, { waitUntil: "networkidle0" });

            const pdfBuffer = await page.pdf({
                format: "A4",
                margin: {
                    top: "15mm",
                    bottom: "15mm",
                    left: "15mm",
                    right: "15mm"
                },
                printBackground: true
            });
            return pdfBuffer;
        } finally {
            await browser.close();
        }
    } catch (puppeteerError) {
        console.warn("Puppeteer launch failed on server, falling back to pure JS PDF generation:", puppeteerError.message);
        try {
            const fallbackPdf = await generatePdfFallback(htmlContent);
            return fallbackPdf;
        } catch (fallbackError) {
            console.error("PDFkit fallback generation error:", fallbackError);
            throw puppeteerError; // If both fail, throw the original Puppeteer error
        }
    }
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
    const systemPrompt = `You are a professional executive resume designer and writer.
Generate a modern, premium, ATS-friendly one-page resume in HTML format.
Ensure it looks as if it were designed in Canva, Novorésumé, or Overleaf, but remains fully ATS-readable (machine-parsable text, clean semantic DOM structure, no images).

Requirements for HTML & CSS:
- Fonts: Use clean, professional typography (e.g. system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif).
- Colors: White background (#ffffff), dark slate body text (#334155), deep blue/navy accent headers (#1e3a8a or #2563eb).
- Layout: 
  - Margin: 15mm to 20mm padding inside a container.
  - No horizontal scroll, clean margins, A4 print layout ready.
- Header:
  - Candidate Name in large bold navy font (22-26px), followed by Subtitle/Target Role in a clean, smaller gray text.
  - A compact contact information row containing Email, Phone, LinkedIn, GitHub, and Portfolio. Make sure all are styled as clickable links (<a href="url">link</a>) with blue accent color and underlined on hover. Use clean inline separator characters (like "|") or inline list elements.
- Section Titles:
  - Bold, uppercase, colored in deep blue (#1e3a8a).
  - Include a thin border-bottom line under each section header (e.g. 1px solid #e2e8f0) or a left accent border.
- Sections:
  - CONTACT, SUMMARY, TECHNICAL SKILLS, PROJECTS, EXPERIENCE/INTERNSHIP, EDUCATION, CERTIFICATIONS, ACHIEVEMENTS.
- Technical Skills Section:
  - Group skills into categories (e.g., Languages, Frontend, Backend, Databases, Tools).
  - Display them as inline bulleted elements or beautifully styled light-gray tag chips (background: #f1f5f9, padding: 4px 8px, border-radius: 4px, margin: 3px, inline-block) rather than long paragraphs, to save space and look modern.
- Projects Section:
  - Display each project as a clear card-like block or row.
  - Project title (bold), tech stack in italics or a small blue label.
  - 3-5 concise bullet points highlighting key achievements and technical contributions.
  - Clickable links for "GitHub" and "Live Demo" if present.
- Experience / Internship Section:
  - Company name, role title, duration/dates, and bulleted list of responsibilities/achievements.
- Education Section:
  - Structured timeline or list showing Degree, Institution, Graduation Year, and GPA if available.
- Page break safety:
  - Avoid awkward splitting across pages: use CSS rules like "h2, h3 { page-break-after: avoid; }" and ".project-card, .experience-block, .education-block { page-break-inside: avoid; }".
- Embed all CSS inside a <style> tag in the HTML head.`;

    const userPrompt = `Create a beautifully styled, premium, tailored, ATS-friendly one-page resume based on the following candidate details and target Job Description. Make sure all contact links and project repositories are correctly parsed and rendered as clickable <a> links.

Candidate Resume Details:
${resume || "Not provided"}

Candidate Self-Description:
${selfDescription || "Not provided"}

Target Job Description:
${jobDescription}

Ensure the output is valid JSON in this schema format:
{
  "html": "The full HTML string containing head, style, and body"
}`;

    try {
        const result = await callGroqWithJsonRetry(systemPrompt, userPrompt, resumePdfSchema);
        const pdfBuffer = await generatePdfFromHtml(result.html);
        return pdfBuffer;
    } catch (error) {
        console.error("AI Generation error in generateResumePdf:", error);
        throw new Error(`Failed to generate resume PDF: ${error.message}`);
    }
}

module.exports = { generateInterviewReport, generateResumePdf };