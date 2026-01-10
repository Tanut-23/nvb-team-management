import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

// GET - Fetch all teams
export async function GET() {
  try {
    const db = await getDatabase()
    const teams = await db.collection("teams").find({}).toArray()
    return NextResponse.json(teams)
  } catch (error) {
    console.error("Error fetching teams:", error)
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 })
  }
}

// POST - Add new team
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "ชื่อทีมไม่สามารถเว้นว่างได้" }, { status: 400 })
    }

    const db = await getDatabase()
    const teamId = Date.now().toString()

    const result = await db.collection("teams").insertOne({
      id: teamId,
      name: name.trim(),
      positions: [],
    })

    return NextResponse.json({
      _id: result.insertedId,
      id: teamId,
      name: name.trim(),
      positions: [],
    })
  } catch (error) {
    console.error("Error adding team:", error)
    return NextResponse.json({ error: "Failed to add team" }, { status: 500 })
  }
}
