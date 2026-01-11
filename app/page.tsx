"use client"
import { useState, useEffect, useCallback } from "react"
import useSWR, { mutate } from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Calendar } from "@/components/ui/calendar"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Plus,
  Trash2,
  Edit,
  MoreVertical,
  CalendarIcon,
  FileDown,
  Users,
  Settings,
  UserPlus,
  AlertCircle,
  Loader2,
  Check,
  ChevronsUpDown,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { exportScheduleToPDF } from "@/lib/pdf-export"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Types
interface Member {
  _id: string
  name: string
}

interface Team {
  _id?: string
  id: string
  name: string
  positions: string[]
}

interface Schedule {
  _id?: string
  id: string
  teamId: string
  date: string
  assignments: Record<string, string>
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ChurchScheduleApp() {
  // SWR for data fetching
  const { data: members = [], error: membersError } = useSWR<Member[]>("/api/members", fetcher)
  const { data: teams = [], error: teamsError } = useSWR<Team[]>("/api/teams", fetcher)
  const { data: schedules = [], error: schedulesError } = useSWR<Schedule[]>("/api/schedules", fetcher)

  const [activeTeamId, setActiveTeamId] = useState<string>("")
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dialog states
  const [newTeamName, setNewTeamName] = useState("")
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [isEditTeamOpen, setIsEditTeamOpen] = useState(false)
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null)

  const [newPosition, setNewPosition] = useState("")
  const [isAddPositionOpen, setIsAddPositionOpen] = useState(false)

  const [newDate, setNewDate] = useState<Date | undefined>(undefined)
  const [isAddDateOpen, setIsAddDateOpen] = useState(false)

  // Member management states
  const [newMemberName, setNewMemberName] = useState("")
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [isMemberListOpen, setIsMemberListOpen] = useState(false)
  const [memberError, setMemberError] = useState<string | null>(null)
  const [isAddingMember, setIsAddingMember] = useState(false)

  const [editingCell, setEditingCell] = useState<{
    scheduleId: string
    position: string
  } | null>(null)
  const [cellError, setCellError] = useState<string | null>(null)
  const [isSavingCell, setIsSavingCell] = useState(false)
  const [comboboxOpen, setComboboxOpen] = useState(false)

  // Set active team on initial load
  useEffect(() => {
    if (teams.length > 0 && !activeTeamId) {
      setActiveTeamId(teams[0].id)
    }
  }, [teams, activeTeamId])

  const activeTeam = teams.find((t) => t.id === activeTeamId)
  const teamSchedules = schedules
    .filter((s) => s.teamId === activeTeamId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Clear errors after a timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const handleAddMember = async () => {
    if (!newMemberName.trim()) return

    setIsAddingMember(true)
    setMemberError(null)

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newMemberName.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMemberError(data.error || "ไม่สามารถเพิ่มสมาชิกได้")
        return
      }

      mutate("/api/members")
      setNewMemberName("")
      setIsAddMemberOpen(false)
    } catch {
      setMemberError("เกิดข้อผิดพลาด กรุณาลองใหม่")
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleDeleteMember = async (id: string) => {
    try {
      await fetch(`/api/members/${id}`, { method: "DELETE" })
      mutate("/api/members")
    } catch {
      setError("ไม่สามารถลบสมาชิกได้")
    }
  }

  // Team CRUD
  const handleAddTeam = async () => {
    if (!newTeamName.trim()) return

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "ไม่สามารถเพิ่มทีมได้")
        return
      }

      mutate("/api/teams")
      setActiveTeamId(data.id)
      setNewTeamName("")
      setIsAddTeamOpen(false)
    } catch {
      setError("ไม่สามารถเพิ่มทีมได้")
    }
  }

  const handleEditTeam = async () => {
    if (!editingTeam || !editingTeam.name.trim()) return

    try {
      await fetch(`/api/teams/${editingTeam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingTeam.name.trim() }),
      })

      mutate("/api/teams")
      setEditingTeam(null)
      setIsEditTeamOpen(false)
    } catch {
      setError("ไม่สามารถแก้ไขทีมได้")
    }
  }

  const handleDeleteTeam = async () => {
    if (!deleteTeamId) return

    try {
      await fetch(`/api/teams/${deleteTeamId}`, { method: "DELETE" })
      mutate("/api/teams")
      mutate("/api/schedules")

      if (activeTeamId === deleteTeamId) {
        setActiveTeamId(teams.find((t) => t.id !== deleteTeamId)?.id || "")
      }
      setDeleteTeamId(null)
    } catch {
      setError("ไม่สามารถลบทีมได้")
    }
  }

  // Position CRUD
  const handleAddPosition = async () => {
    if (!newPosition.trim() || !activeTeam) return

    try {
      const updatedPositions = [...activeTeam.positions, newPosition.trim()]
      await fetch(`/api/teams/${activeTeamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions: updatedPositions }),
      })

      mutate("/api/teams")
      setNewPosition("")
      setIsAddPositionOpen(false)
    } catch {
      setError("ไม่สามารถเพิ่มตำแหน่งได้")
    }
  }

  const handleDeletePosition = async (position: string) => {
    if (!activeTeam) return

    try {
      const updatedPositions = activeTeam.positions.filter((p) => p !== position)
      await fetch(`/api/teams/${activeTeamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions: updatedPositions }),
      })

      mutate("/api/teams")
    } catch {
      setError("ไม่สามารถลบตำแหน่งได้")
    }
  }

  // Schedule/Date CRUD
  const handleAddDate = async () => {
    if (!newDate || !activeTeam) return

    const dateStr = format(newDate, "yyyy-MM-dd")

    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: activeTeamId, date: dateStr }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "ไม่สามารถเพิ่มวันที่ได้")
        return
      }

      mutate("/api/schedules")
      setNewDate(undefined)
      setIsAddDateOpen(false)
    } catch {
      setError("ไม่สามารถเพิ่มวันที่ได้")
    }
  }

  const handleDeleteDate = async (scheduleId: string) => {
    try {
      await fetch(`/api/schedules/${scheduleId}`, { method: "DELETE" })
      mutate("/api/schedules")
    } catch {
      setError("ไม่สามารถลบวันที่ได้")
    }
  }

  const handleCellClick = (scheduleId: string, position: string) => {
    setEditingCell({ scheduleId, position })
    setCellError(null)
    setComboboxOpen(true)
  }

  const handleMemberSelect = useCallback(
    async (memberName: string) => {
      if (!editingCell) return

      setIsSavingCell(true)
      setCellError(null)

      try {
        const res = await fetch(`/api/schedules/${editingCell.scheduleId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            position: editingCell.position,
            memberName: memberName,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          setCellError(data.error || "ไม่สามารถบันทึกได้")
          return
        }

        mutate("/api/schedules")
        setEditingCell(null)
        setComboboxOpen(false)
      } catch {
        setCellError("เกิดข้อผิดพลาด กรุณาลองใหม่")
      } finally {
        setIsSavingCell(false)
      }
    },
    [editingCell],
  )

  const handleClearAssignment = useCallback(async () => {
    if (!editingCell) return

    setIsSavingCell(true)
    setCellError(null)

    try {
      const res = await fetch(`/api/schedules/${editingCell.scheduleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position: editingCell.position,
          memberName: "",
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setCellError(data.error || "ไม่สามารถลบได้")
        return
      }

      mutate("/api/schedules")
      setEditingCell(null)
      setComboboxOpen(false)
    } catch {
      setCellError("เกิดข้อผิดพลาด กรุณาลองใหม่")
    } finally {
      setIsSavingCell(false)
    }
  }, [editingCell])

  // PDF Export
  const handleExportPDF = async () => {
    if (!activeTeam) return
    setIsExporting(true)
    try {
      await exportScheduleToPDF(activeTeam, teamSchedules)
    } catch (error) {
      console.error("Export error:", error)
      setError("ไม่สามารถ export PDF ได้")
    } finally {
      setIsExporting(false)
    }
  }

  const isLoading = !members && !membersError
  const hasError = membersError || teamsError || schedulesError

  if (hasError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้ กรุณาตรวจสอบการตั้งค่า MONGODB_URI</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 z-[100]">
          <Alert variant="destructive" className="w-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">ระบบจัดตารางเวร</h1>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isMemberListOpen} onOpenChange={setIsMemberListOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  จัดการสมาชิก
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>รายชื่อสมาชิก</DialogTitle>
                  <DialogDescription>จัดการสมาชิกในโบสถ์ของคุณ</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Add new member */}
                  <div className="flex gap-2">
                    <Input
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="ชื่อสมาชิกใหม่"
                      onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                    />
                    <Button onClick={handleAddMember} disabled={isAddingMember}>
                      {isAddingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>

                  {memberError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{memberError}</AlertDescription>
                    </Alert>
                  )}

                  {/* Member list */}
                  <ScrollArea className="h-[300px] rounded-md border p-2">
                    {members.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">ยังไม่มีสมาชิก</p>
                    ) : (
                      <div className="space-y-2">
                        {members.map((member) => (
                          <div
                            key={member._id}
                            className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                          >
                            <span>{member.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteMember(member._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddTeamOpen} onOpenChange={setIsAddTeamOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  เพิ่มทีม
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>เพิ่มทีมใหม่</DialogTitle>
                  <DialogDescription>กรอกชื่อทีมที่ต้องการเพิ่ม</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="teamName">ชื่อทีม</Label>
                    <Input
                      id="teamName"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="เช่น มีเดีย, ปฏิคม"
                      onKeyDown={(e) => e.key === "Enter" && handleAddTeam()}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddTeamOpen(false)}>
                    ยกเลิก
                  </Button>
                  <Button onClick={handleAddTeam}>เพิ่มทีม</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : teams.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">ยังไม่มีทีม</h2>
            <p className="text-muted-foreground mb-4">เริ่มต้นด้วยการเพิ่มทีมแรกของคุณ</p>
            <Button onClick={() => setIsAddTeamOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มทีม
            </Button>
          </Card>
        ) : (
          <Tabs value={activeTeamId} onValueChange={setActiveTeamId}>
            {/* Team Tabs */}
            <div className="flex items-center gap-4 mb-6">
              <ScrollArea className="flex-1">
                <TabsList className="inline-flex h-10 w-max">
                  {teams.map((team) => (
                    <TabsTrigger key={team.id} value={team.id} className="px-4">
                      {team.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>

            {teams.map((team) => (
              <TabsContent key={team.id} value={team.id} className="space-y-6">
                {/* Team Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">{team.name}</h2>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingTeam({ ...team })
                            setIsEditTeamOpen(true)
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          แก้ไขชื่อทีม
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTeamId(team.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          ลบทีม
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Dialog open={isAddPositionOpen} onOpenChange={setIsAddPositionOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="mr-2 h-4 w-4" />
                          เพิ่มตำแหน่ง
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>เพิ่มตำแหน่งงาน</DialogTitle>
                          <DialogDescription>กรอกชื่อตำแหน่งที่ต้องการเพิ่มในทีม {team.name}</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="positionName">ชื่อตำแหน่ง</Label>
                            <Input
                              id="positionName"
                              value={newPosition}
                              onChange={(e) => setNewPosition(e.target.value)}
                              placeholder="เช่น Camera 1, Sound"
                              onKeyDown={(e) => e.key === "Enter" && handleAddPosition()}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddPositionOpen(false)}>
                            ยกเลิก
                          </Button>
                          <Button onClick={handleAddPosition}>เพิ่มตำแหน่ง</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={isAddDateOpen} onOpenChange={setIsAddDateOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          เพิ่มวันที่
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>เพิ่มวันที่รับใช้</DialogTitle>
                          <DialogDescription>เลือกวันที่สำหรับการรับใช้</DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-center py-4">
                          <Calendar
                            mode="single"
                            selected={newDate}
                            onSelect={setNewDate}
                            locale={th}
                            className="rounded-md border"
                          />
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddDateOpen(false)}>
                            ยกเลิก
                          </Button>
                          <Button onClick={handleAddDate} disabled={!newDate}>
                            เพิ่มวันที่
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button onClick={handleExportPDF} disabled={isExporting || team.positions.length === 0}>
                      <FileDown className="mr-2 h-4 w-4" />
                      {isExporting ? "กำลัง Export..." : "Export PDF"}
                    </Button>
                  </div>
                </div>

                {/* Schedule Table */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">ตารางเวร</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {team.positions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>ยังไม่มีตำแหน่งงาน</p>
                        <p className="text-sm">กดปุ่ม "เพิ่มตำแหน่ง" เพื่อเริ่มต้น</p>
                      </div>
                    ) : (
                      <ScrollArea className="w-full">
                        <div className="min-w-max">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="border p-3 text-left font-semibold min-w-[120px] left-0 bg-muted/50">
                                  วันที่
                                </th>
                                {team.positions.map((position) => (
                                  <th key={position} className="border p-3 text-left font-semibold min-w-[140px]">
                                    <div className="flex items-center justify-between gap-2">
                                      <span>{position}</span>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-6 w-6">
                                            <MoreVertical className="h-3 w-3" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                          <DropdownMenuItem
                                            className="text-destructive"
                                            onClick={() => handleDeletePosition(position)}
                                          >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            ลบตำแหน่ง
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </th>
                                ))}
                                <th className="border p-3 w-[60px]"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {teamSchedules.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={team.positions.length + 2}
                                    className="border p-8 text-center text-muted-foreground"
                                  >
                                    ยังไม่มีข้อมูลวันที่ กดปุ่ม "เพิ่มวันที่" เพื่อเริ่มต้น
                                  </td>
                                </tr>
                              ) : (
                                teamSchedules.map((schedule, index) => (
                                  <tr
                                    key={schedule.id}
                                    className={cn(index % 2 === 0 ? "bg-background" : "bg-muted/30")}
                                  >
                                    <td className="border p-3 font-medium left-0 bg-inherit">
                                      {format(new Date(schedule.date), "d MMM yyyy", { locale: th })}
                                    </td>
                                    {team.positions.map((position) => {
                                      const isEditing =
                                        editingCell?.scheduleId === schedule.id && editingCell?.position === position
                                      const value = schedule.assignments[position] || ""

                                      return (
                                        <td
                                          key={position}
                                          className="border p-0"
                                          onClick={() => !isEditing && handleCellClick(schedule.id, position)}
                                        >
                                          {isEditing ? (
                                            <div className="relative">
                                              <Popover
                                                open={comboboxOpen}
                                                onOpenChange={(open) => {
                                                  setComboboxOpen(open)
                                                  if (!open) {
                                                    setEditingCell(null)
                                                    setCellError(null)
                                                  }
                                                }}
                                              >
                                                <PopoverTrigger asChild>
                                                  <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={comboboxOpen}
                                                    className="w-full justify-between border-0 rounded-none h-[48px] focus:ring-2 focus:ring-primary bg-transparent"
                                                  >
                                                    {value || "เลือกสมาชิก..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                  </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[200px] p-0" align="start">
                                                  <Command>
                                                    <CommandInput placeholder="ค้นหาสมาชิก..." />
                                                    <CommandList>
                                                      <CommandEmpty>ไม่พบสมาชิก</CommandEmpty>
                                                      <CommandGroup>
                                                        {value && (
                                                          <CommandItem
                                                            value="__clear__"
                                                            onSelect={handleClearAssignment}
                                                            className="text-destructive"
                                                          >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            ลบออก
                                                          </CommandItem>
                                                        )}
                                                        {members.map((member) => (
                                                          <CommandItem
                                                            key={member._id}
                                                            value={member.name}
                                                            onSelect={(currentValue) => {
                                                              handleMemberSelect(currentValue)
                                                            }}
                                                            disabled={isSavingCell}
                                                          >
                                                            <Check
                                                              className={cn(
                                                                "mr-2 h-4 w-4",
                                                                value.toLowerCase() === member.name.toLowerCase()
                                                                  ? "opacity-100"
                                                                  : "opacity-0",
                                                              )}
                                                            />
                                                            {member.name}
                                                          </CommandItem>
                                                        ))}
                                                      </CommandGroup>
                                                    </CommandList>
                                                  </Command>
                                                  {(cellError || isSavingCell) && (
                                                    <div className="p-2 border-t">
                                                      {isSavingCell && (
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                          <Loader2 className="h-3 w-3 animate-spin" />
                                                          กำลังบันทึก...
                                                        </div>
                                                      )}
                                                      {cellError && (
                                                        <div className="text-xs text-destructive">{cellError}</div>
                                                      )}
                                                    </div>
                                                  )}
                                                </PopoverContent>
                                              </Popover>
                                            </div>
                                          ) : (
                                            <div className="p-3 min-h-[48px] cursor-pointer hover:bg-primary/5 transition-colors">
                                              {value || <span className="text-muted-foreground/50">-</span>}
                                            </div>
                                          )}
                                        </td>
                                      )
                                    })}
                                    <td className="border p-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => handleDeleteDate(schedule.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </main>

      {/* Edit Team Dialog */}
      <Dialog open={isEditTeamOpen} onOpenChange={setIsEditTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขชื่อทีม</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editTeamName">ชื่อทีม</Label>
              <Input
                id="editTeamName"
                value={editingTeam?.name || ""}
                onChange={(e) => setEditingTeam(editingTeam ? { ...editingTeam, name: e.target.value } : null)}
                onKeyDown={(e) => e.key === "Enter" && handleEditTeam()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditTeamOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleEditTeam}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Team Confirmation */}
      <AlertDialog open={!!deleteTeamId} onOpenChange={() => setDeleteTeamId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบทีม</AlertDialogTitle>
            <AlertDialogDescription>การลบทีมจะลบข้อมูลตารางเวรทั้งหมดของทีมนี้ด้วย คุณแน่ใจหรือไม่?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTeam}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ลบทีม
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
