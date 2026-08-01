import { getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateResumePdf } from "../services/interview.api"
import { useContext } from "react"
import { InterviewContext } from "../interview.context"

export const useInterview = () => {
    const context = useContext(InterviewContext)

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const { loading, setLoading, report, setReport, reports, setReports } = context

    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true)
        try {
            const response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
            if (response && response.interviewReport) {
                setReport(response.interviewReport)
                return response.interviewReport
            }
            return null
        } catch (error) {
            console.error("Generate report hook error:", error)
            throw error
        } finally {
            setLoading(false)
        }
    }

    const getReportById = async (interviewId) => {
        setLoading(true)
        try {
            const response = await getInterviewReportById(interviewId)
            if (response && response.interviewReport) {
                setReport(response.interviewReport)
                return response.interviewReport
            }
            return null
        } catch (error) {
            console.error("Get report by ID hook error:", error)
            throw error
        } finally {
            setLoading(false)
        }
    }

    const getReports = async () => {
        setLoading(true)
        try {
            const response = await getAllInterviewReports()
            if (response && response.interviewReports) {
                setReports(response.interviewReports)
                return response.interviewReports
            }
            return []
        } catch (error) {
            console.error("Get reports hook error:", error)
            return []
        } finally {
            setLoading(false)
        }
    }

    const getResumePdf = async (interviewReportId) => {
        setLoading(true)
        try {
            const response = await generateResumePdf({ interviewReportId })
            const blob = new Blob([ response ], { type: "application/pdf" })
            
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            if (isMobile) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64data = reader.result;
                    const newTab = window.open();
                    if (newTab) {
                        newTab.document.write(`
                            <html>
                            <head><title>Resume PDF</title></head>
                            <body style="margin:0;">
                                <iframe src="${base64data}" frameborder="0" style="border:0; width:100%; height:100vh;" allowfullscreen></iframe>
                            </body>
                            </html>
                        `);
                    } else {
                        window.location.href = base64data;
                    }
                };
                reader.readAsDataURL(blob);
            } else {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.setAttribute("download", `resume_${interviewReportId}.pdf`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }
        }
        catch (error) {
            console.error("Download resume PDF hook error:", error)
            alert("Failed to download resume PDF. Please try again.")
        } finally {
            setLoading(false)
        }
    }


    return { loading, report, reports, generateReport, getReportById, getReports, getResumePdf }
}