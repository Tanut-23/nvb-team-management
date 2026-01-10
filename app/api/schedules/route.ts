import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

// GET - Fetch all schedules
export async function GET() {
  try {
    const db = await getDatabase()
    const schedules = await db.collection("schedules").find({}).toArray()
    return NextResponse.json(schedules)
  } catch (error) {
    console.error("Error fetching schedules:", error)
    return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 })
  }
}

// POST - Add new schedule
export async function POST(request: NextRequest) {
  try {
    const { teamId, date } = await request.json()

    if (!teamId || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = await getDatabase()

    // Check if schedule for this team and date already exists
    const existingSchedule = await db.collection("schedules").findOne({ teamId, date })
    if (existingSchedule) {
      return NextResponse.json({ error: "วันที่นี้มีอยู่แล้ว" }, { status: 400 })
    }

    const scheduleId = Date.now().toString()
    const result = await db.collection("schedules").insertOne({
      id: scheduleId,
      teamId,
      date,
      assignments: {},
    })

    return NextResponse.json({
      _id: result.insertedId,
      id: scheduleId,
      teamId,
      date,
      assignments: {},
    })
  } catch (error) {
    console.error("Error adding schedule:", error)
    return NextResponse.json({ error: "Failed to add schedule" }, { status: 500 })
  }
}
