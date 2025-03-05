import fs from 'fs'
import path from 'path'

const SESSIONS_FILE = path.join(process.cwd(), 'sessions.json')
export let sessions: Record<string, any> = {}

export function loadSessions(): void {
  if (fs.existsSync(SESSIONS_FILE)) {
    sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'))
  }
}

export function saveSessions(): void {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2))
}

export function normalizeText(text: unknown): string {
  return text?.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || ''
}

export const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))