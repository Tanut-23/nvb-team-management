import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

// PUT - Update team
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const db = await getDatabase()

    const updateFields: Record<string, unknown> = {}
    if (body.name) updateFields.name = body.name
    if (body.positions) updateFields.positions = body.positions

    await db.collection("teams").updateOne({ id }, { $set: updateFields })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating team:", error)
    return NextResponse.json({ error: "Failed to update team" }, { status: 500 })
  }
}

// DELETE - Remove team
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = await getDatabase()

    await db.collection("teams").deleteOne({ id })
    await db.collection("schedules").deleteMany({ teamId: id })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting team:", error)
    return NextResponse.json({ error: "Failed to delete team" }, { status: 500 })
  }
}
