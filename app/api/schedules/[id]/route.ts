import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

// PUT - Update schedule (with validation: 1 person can only be in 1 team per day)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { assignments, position, memberName } = await request.json()
    const db = await getDatabase()

    // Get current schedule
    const currentSchedule = await db.collection("schedules").findOne({ id })
    if (!currentSchedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    // If updating a single position assignment, validate member uniqueness
    if (position !== undefined && memberName !== undefined) {
      const trimmedName = memberName.trim()

      if (trimmedName) {
        const allSchedulesOnDate = await db
          .collection("schedules")
          .find({
            date: currentSchedule.date,
            id: { $ne: id }, // Exclude current schedule
          })
          .toArray()

        // Check each schedule for conflicts
        for (const conflictingSchedule of allSchedulesOnDate) {
          const conflictingAssignments = conflictingSchedule.assignments || {}
          for (const [pos, name] of Object.entries(conflictingAssignments)) {
            if ((name as string).toLowerCase() === trimmedName.toLowerCase()) {
              const conflictingTeam = await db.collection("teams").findOne({ id: conflictingSchedule.teamId })
              return NextResponse.json(
                {
                  error: `${trimmedName} ถูกกำหนดไว้แล้วในทีม "${conflictingTeam?.name || "อื่น"}" ตำแหน่ง "${pos}" ในวันเดียวกัน`,
                },
                { status: 400 },
              )
            }
          }
        }

        // Also check current schedule for duplicate in different positions
        const currentAssignments = currentSchedule.assignments || {}
        for (const [pos, name] of Object.entries(currentAssignments)) {
          if (pos !== position && (name as string).toLowerCase() === trimmedName.toLowerCase()) {
            return NextResponse.json(
              {
                error: `${trimmedName} ถูกกำหนดไว้แล้วในตำแหน่ง "${pos}" ของทีมนี้`,
              },
              { status: 400 },
            )
          }
        }
      }

      // Update single position
      const newAssignments = {
        ...currentSchedule.assignments,
        [position]: trimmedName,
      }

      await db.collection("schedules").updateOne({ id }, { $set: { assignments: newAssignments } })
    } else if (assignments) {
      // Full assignments update
      await db.collection("schedules").updateOne({ id }, { $set: { assignments } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating schedule:", error)
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 })
  }
}

// DELETE - Remove schedule
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = await getDatabase()

    await db.collection("schedules").deleteOne({ id })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting schedule:", error)
    return NextResponse.json({ error: "Failed to delete schedule" }, { status: 500 })
  }
}
