import { NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

// DELETE - Remove all schedules (clear board)
export async function DELETE(request: NextRequest) {
  try {
    const { teamId } = await request.json()

    if(!teamId) {
      return NextResponse.json(
        {error: "Team id is required"},
        {status: 400}
        
      )
    }
    const db = await getDatabase()

    const result = await db
      .collection("schedules")
      .deleteMany({ teamId })

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    })
  } catch (error) {
    console.error("Error deleting all team schedules:", error)
    return NextResponse.json(
      { error: "Failed to delete all schedules" + detail },
      { status: 500 }
    )
  }
}
