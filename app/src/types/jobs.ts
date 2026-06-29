/* EXAMPLE
export interface JobResult {
  success: boolean
  result?: unknown
  error?: string
}
*/
export type JobStatus = "queued" | "processing" | "success" | "failed";