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

const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job description"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The behavioral question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
});

const resumePdfSchema = z.object({
    html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
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

            // Attempt to parse JSON
            let parsedData;
            try {
                parsedData = JSON.parse(content);
            } catch (parseErr) {
                throw new Error(`JSON parsing failed: ${parseErr.message}. Raw response: ${content}`);
            }

            // Validate against the Zod schema
            const validationResult = schema.safeParse(parsedData);
            if (!validationResult.success) {
                throw new Error(`Schema validation failed: ${validationResult.error.message}`);
            }

            return validationResult.data;
        } catch (error) {
            console.error(`Groq API Attempt ${attempt} failed:`, error.message);
            lastError = error;
            if (attempt < retries) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
    }
    throw new Error(`Failed to get a valid response from Groq after ${retries} attempts. Last error: ${lastError.message}`);
}

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    const systemPrompt = `You are an expert technical interviewer and senior HR specialist.
Generate a highly professional, detailed, and realistic interview preparation report.
The output MUST be a valid JSON object matching the requested schema.
Ensure that:
1. The 'matchScore' is a realistic number between 0 and 100 based on the candidate's profile fit for the target job description.
2. 'technicalQuestions' contains realistic, role-specific, challenging technical questions with clear intention and detailed answers/approaches.
3. 'behavioralQuestions' contains realistic situational and behavioral questions (incorporate STAR methodology guidelines in the answers) with clear intention and detailed answers.
4. 'skillGaps' lists actual skills from the job description that are missing or weak in the resume/self-description, with appropriate severity.
5. 'preparationPlan' is a highly structured, day-wise preparation plan containing actionable tasks for the candidate.
6. 'title' is the job title.

The output must be formatted as a JSON object. Do not include markdown code block syntax (like \`\`\`json) inside the JSON response itself.`;

    const userPrompt = `Analyze the following candidate details against the job description and generate an interview report.

Candidate Resume:
${resume || "Not provided"}

Candidate Self-Description:
${selfDescription || "Not provided"}

Target Job Description:
${jobDescription}

Provide the response in the following JSON schema format:
${JSON.stringify(zodToJsonSchema(interviewReportSchema), null, 2)}`;

    try {
        const report = await callGroqWithJsonRetry(systemPrompt, userPrompt, interviewReportSchema);
        return report;
    } catch (error) {
        console.error("AI Generation error in generateInterviewReport:", error);
        throw new Error(`Failed to generate interview report: ${error.message}`);
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
                top: "20mm",
                bottom: "20mm",
                left: "15mm",
                right: "15mm"
            }
        });
        return pdfBuffer;
    } finally {
        await browser.close();
    }
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
    const systemPrompt = `You are a professional resume writer and career coach.
Generate a clean, highly professional, ATS-friendly resume in HTML format.
The HTML content should be tailored for the given job description, highlighting the candidate's strengths and relevant experience.
Ensure the HTML:
- Uses modern, elegant typography (e.g., Arial, Helvetica, system-ui, clean line height, proper spacing).
- Is structured logically with semantic HTML (sections for header/contact, professional summary, work experience, education, skills, projects).
- Uses subtle, professional styling (e.g., deep slate/navy accents, clean borders/dividers) and is strictly 1-2 pages long.
- Is clean, standard HTML/CSS compatible with Puppeteer's PDF converter.
- Sounds completely natural, professional, and human-written. Do not use generic AI buzzwords or placeholders.
- Is ATS-friendly (uses standard headings, text-based layouts, no complex nested tables/graphics).

The output MUST be a JSON object with a single field "html" containing the HTML string of the resume.`;

    const userPrompt = `Generate a tailored, ATS-friendly resume.

Candidate Resume Content:
${resume || "Not provided"}

Candidate Self-Description:
${selfDescription || "Not provided"}

Target Job Description:
${jobDescription}

Provide the response in the following JSON schema format:
{
  "html": "The HTML content of the resume"
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