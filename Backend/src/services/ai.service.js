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
        experienceMatch: z.number().describe("Score for career duration and roles match (0-100)"),
        keywordMatch: z.number().describe("Score for matching resume keywords to JD (0-100)"),
        educationMatch: z.number().describe("Score for academic and certification match (0-100)"),
        projectsMatch: z.number().describe("Score for relevance of projects listed (0-100)")
    }).describe("Granular match analysis parameters"),
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
        question: z.string().describe("The interview question"),
        intention: z.string().describe("Why the interviewer asks this question"),
        answer: z.string().describe("Ideal direct explanation or code snippet structure"),
        difficulty: z.enum([ "easy", "medium", "hard" ]).describe("Question difficulty"),
        commonMistakes: z.string().describe("Common pitfalls candidates make when answering"),
        followUpQuestions: z.array(z.string()).describe("2-3 natural follow-up questions an interviewer might ask next")
    })).describe("20-25 technical questions covering easy, medium, and hard difficulty"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The behavioral scenario question"),
        intention: z.string().describe("Intention behind the behavioral question"),
        answer: z.string().describe("Short answer approach advice"),
        tips: z.string().describe("Tips for structure (STAR format guidelines)"),
        sampleAnswer: z.string().describe("A full example response using the STAR method (Situation, Task, Action, Result)")
    })).describe("15-20 behavioral questions")
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
    const overviewSystem = `You are a senior ATS Match analyst. Analyze the resume/self-description against the target job description. Generate matching statistics (0-100) and identify missing skill gaps. Make sure 'matchScore' matches 'matchScoreDetails.overallScore'.`;
    const overviewUser = `${candidateContext}\n\n${targetJD}\n\nProvide the response in this JSON schema format:\n${JSON.stringify(zodToJsonSchema(overviewSchema))}`;

    // Prompt 2: Technical & Behavioral Questions
    const questionsSystem = `You are an elite technical interviewer. Generate exactly 20-25 high-quality technical questions (mix of easy, medium, and hard difficulty) and exactly 15-20 behavioral questions customized to the candidate's profile and the target job description. Provide intentions, ideal answers, common mistakes, and follow-up questions. Behavioral answers must use structural STAR guidelines.`;
    const questionsUser = `${candidateContext}\n\n${targetJD}\n\nProvide the response in this JSON schema format:\n${JSON.stringify(zodToJsonSchema(questionsSchema))}`;

    // Prompt 3: 30-Day Preparation Roadmap
    const roadmapSystem = `You are a computer science mentor. Generate a detailed 30-day study plan categorizing each day's study tasks (DSA, OOP, DBMS, OS, Computer Networks, System Design, Projects, HR Interview, Mock Interviews) to fill the candidate's gaps for the target job description. Every day MUST have topic, theory, practice problems, interview questions, resources, estimatedTime, category, and tasks.`;
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

async function generatePdfFromHtml(htmlContent) {
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
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
    const systemPrompt = `You are a professional executive resume writer.
Generate a clean, highly professional, ATS-friendly resume in HTML format.
Ensure the HTML is structured beautifully using modern CSS:
- Dark slate headings (#1e293b), crimson accents (#e1034d), and dark text (#334155).
- Clear layout columns or list details for Header, Summary, Skills, Work Experience, Education, Projects.
- ATS compatible: standard headings, simple text elements, no overlapping layers, print-ready.
- Embed all CSS inside a <style> tag in the HTML head. Ensure a clean page outline.`;

    const userPrompt = `Generate a tailored, ATS-friendly resume.

Candidate Resume Content:
${resume || "Not provided"}

Candidate Self-Description:
${selfDescription || "Not provided"}

Target Job Description:
${jobDescription}

Provide the response in the following JSON schema format:
{
  "html": "The HTML content of the resume with premium styling"
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