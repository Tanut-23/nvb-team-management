import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

// POST - Validate if a member can be assigned (1 person per team per day)
export async function POST(request: NextRequest) {
  try {
    const { memberName, date, currentScheduleId, currentTeamId } = await request.json()

    if (!memberName || !date) {
      return NextResponse.json({ valid: true })
    }

    const trimmedName = memberName.trim()
    if (!trimmedName) {
      return NextResponse.json({ valid: true })
    }

    const db = await getDatabase()

    // Find all schedules for the same date
    const schedulesOnDate = await db.collection("schedules").find({ date }).toArray()

    for (const schedule of schedulesOnDate) {
      // Skip current schedule
      if (schedule.id === currentScheduleId) continue

      const assignments = schedule.assignments || {}
      for (const [position, name] of Object.entries(assignments)) {
        if ((name as string).toLowerCase() === trimmedName.toLowerCase()) {
          const team = await db.collection("teams").findOne({ id: schedule.teamId })
          return NextResponse.json({
            valid: false,
            error: `${trimmedName} ถูกกำหนดไว้แล้วในทีม "${team?.name || "อื่น"}" ตำแหน่ง "${position}"`,
          })
        }
      }
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error("Error validating assignment:", error)
    return NextResponse.json({ valid: true }) // Allow on error
  }
}
