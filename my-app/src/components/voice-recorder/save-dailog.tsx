// "use client"

// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

// interface SaveDialogProps {
//   isOpen: boolean
//   fileName: string
//   onFileNameChange: (name: string) => void
//   onSave: () => void
//   onCancel: () => void
// }

// export function SaveDialog({ isOpen, fileName, onFileNameChange, onSave, onCancel }: SaveDialogProps) {
//   return (
//     <Dialog open={isOpen} onOpenChange={onCancel}>
//       <DialogContent>
//         <DialogHeader>
//           <DialogTitle>Save Recording</DialogTitle>
//         </DialogHeader>
//         <div className="space-y-4">
//           <p className="text-muted-foreground">Enter a name for your recording:</p>
//           <Input
//             value={fileName}
//             onChange={(e) => onFileNameChange(e.target.value)}
//             placeholder="My Recording"
//             className="w-full"
//             onKeyDown={(e) => e.key === "Enter" && onSave()}
//           />
//         </div>
//         <DialogFooter>
//           <Button variant="outline" onClick={onCancel}>
//             Cancel
//           </Button>
//           <Button onClick={onSave} disabled={!fileName.trim()}>
//             Rename
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   )
// }
