import { NextResponse } from 'next/server'

// Canva designs cache — synced via Claude MCP
// To refresh: ask Claude to re-sync your Canva designs
export const CANVA_DESIGNS = [
  { id: 'DAHKT1Ojaio', title: 'Elegant B2B SaaS Design with Rounded CTA Button', thumbnail: 'https://design.canva.ai/OSBhAk_ix91z9--', edit_url: 'https://www.canva.com/d/AqONkEOJFX8_XDa', updated_at: 1779376806 },
  { id: 'DAHKT0TQ0Uo', title: 'Instagram Post - THE SAME WORK.', thumbnail: 'https://design.canva.ai/IE0I0ys8VLAdFqZ', edit_url: 'https://www.canva.com/d/9Fj6rL_3gHJSJRt', updated_at: 1779376796 },
  { id: 'DAHKT1owLOY', title: 'Instagram Post - DAILY FOCUS', thumbnail: 'https://design.canva.ai/1DX1Fck3CWvryQ2', edit_url: 'https://www.canva.com/d/P9ctSYeuXI2Ni4H', updated_at: 1779376813 },
  { id: 'DAHKT2nJbuw', title: 'Instagram Post - The same operational work', thumbnail: 'https://design.canva.ai/3WFHnecesvWM3Xb', edit_url: 'https://www.canva.com/d/kjmDjeG4DdsYLgQ', updated_at: 1779376577 },
  { id: 'DAHKTwNF9lo', title: 'Modern Tech Aesthetic for AgentsPilot CRM', thumbnail: 'https://design.canva.ai/6Nxnt-FAJT6ykPw', edit_url: 'https://www.canva.com/d/6NOFz4bcovBS2BT', updated_at: 1779376567 },
  { id: 'DAHKTyWcLfk', title: 'Striking Dark Tech Social Media Post', thumbnail: 'https://design.canva.ai/TVxgvh5gvWR6h2-', edit_url: 'https://www.canva.com/d/jQp8-jU5QBOPUmw', updated_at: 1779376554 },
  { id: 'DAHKT06gyGM', title: 'Instagram Post - The same operational work. Every single day.', thumbnail: 'https://design.canva.ai/tNmIydBfvTG_4FA', edit_url: 'https://www.canva.com/d/6euhI7uj4UFur5K', updated_at: 1779376538 },
  { id: 'DAG_FA4YRUk', title: 'Instagram Post - From Chaos to Clarity', thumbnail: 'https://design.canva.ai/UlXE7s_YrdgSvYU', edit_url: 'https://www.canva.com/d/5zU1BU9lI6DDdFk', updated_at: 1769368149 },
  { id: 'DAG_ETnheIA', title: 'The manager spends the first 90 minutes of the day just sorting through noise.', thumbnail: 'https://design.canva.ai/ZT3F6X4Yeh-QCl2', edit_url: 'https://www.canva.com/d/4XSqVsckBU9-r2r', updated_at: 1769028084 },
  { id: 'DAG-eu3chDE', title: 'Poster - Automation sounds easy — until you have to run it.', thumbnail: 'https://design.canva.ai/FWIvzFTPC-OX59Z', edit_url: 'https://www.canva.com/d/gkt9W9ADww_0Dwu', updated_at: 1768475635 },
  { id: 'DAG8utOnW2o', title: 'WHAT IS AN AI WORKER? Operational AI Assistance', thumbnail: 'https://design.canva.ai/t-g2lFR8_bDrBDT', edit_url: 'https://www.canva.com/d/geVk1QHqC743yTf', updated_at: 1766957950 },
  { id: 'DAG73kKVEBQ', title: 'AgentsPilot', thumbnail: 'https://design.canva.ai/R4x1P6Pv4TKHkyb', edit_url: 'https://www.canva.com/d/vbmfXmTQmu3hcUS', updated_at: 1766861118 },
  { id: 'DAG8urYJD2Q', title: 'Operational AI Assistance', thumbnail: 'https://design.canva.ai/yN6_pqonRDmyJcb', edit_url: 'https://www.canva.com/d/mPZHy3GbOFSbOzU', updated_at: 1766861339 },
  { id: 'DAG8ufL8IuQ', title: 'WHAT IS AN AI WORKER?', thumbnail: 'https://design.canva.ai/x9KLeRBJ-354iKN', edit_url: 'https://www.canva.com/d/XwnDNUyPnUOJm4C', updated_at: 1766859475 },
  { id: 'DAG8ucSrRbM', title: 'Operational AI Assistance — Powered by AI Workers', thumbnail: 'https://design.canva.ai/9krl9WwPH4eH6HN', edit_url: 'https://www.canva.com/d/w8mBOvMx1ALOpqp', updated_at: 1766858063 },
  { id: 'DAG8uZ77zcs', title: 'Instagram Post - OPERATIONAL WORK KEEPS BUSINESSES RUNNING.', thumbnail: 'https://design.canva.ai/9Abk6Tr9ACYwJ15', edit_url: 'https://www.canva.com/d/VLbAQA3F1jJtWrp', updated_at: 1766856095 },
]

export async function GET() {
  return NextResponse.json({ designs: CANVA_DESIGNS })
}
