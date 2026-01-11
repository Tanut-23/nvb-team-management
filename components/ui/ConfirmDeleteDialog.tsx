import * as React from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material"
import DeleteForeverIcon from "@mui/icons-material/DeleteForever"

interface ConfirmDeleteDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  teamName?: string
  loading?: boolean
}

export function ConfirmDeleteDialog({
  open,
  onClose,
  onConfirm,
  teamName,
  loading = false,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2.5, // ← 32px (theme spacing)
          padding: 0.5
        },
      }}
    >
      <DialogTitle className="flex items-center gap-2 text-red-600">
        <DeleteForeverIcon />
        ยืนยันการลบ
      </DialogTitle>

      <DialogContent>
        <DialogContentText>
          คุณกำลังจะลบ <strong>ตารางทั้งหมด</strong>
          {teamName && (
            <>
              {" "}
              ของทีม <strong>{teamName}</strong>
            </>
          )}
          <br />
          การกระทำนี้ <strong>ไม่สามารถย้อนกลับได้</strong>
        </DialogContentText>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          ยกเลิก
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          disabled={loading}
        >
          {loading ? "กำลังลบ..." : "ลบทั้งหมด"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
