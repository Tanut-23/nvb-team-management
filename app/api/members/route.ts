import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

// GET - Fetch all members
export async function GET() {
  try {
    const db = await getDatabase()
    const members = await db.collection("members").find({}).sort({ name: 1 }).toArray()
    return NextResponse.json(members)
  } catch (error) {
    console.error("Error fetching members:", error)
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 })
  }
}

// POST - Add new member
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "ชื่อไม่สามารถเว้นว่างได้" }, { status: 400 })
    }

    const trimmedName = name.trim()
    const db = await getDatabase()

    // Check if member name already exists (case-insensitive)
    const existingMember = await db.collection("members").findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
    })

    if (existingMember) {
      return NextResponse.json({ error: "ชื่อนี้มีอยู่ในระบบแล้ว" }, { status: 400 })
    }

    const result = await db.collection("members").insertOne({
      name: trimmedName,
      createdAt: new Date(),
    })

    return NextResponse.json({
      _id: result.insertedId,
      name: trimmedName,
      createdAt: new Date(),
    })
  } catch (error) {
    console.error("Error adding member:", error)
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 })
  }
}
