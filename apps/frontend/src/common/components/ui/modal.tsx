"use client"

import * as React from "react"
import { cn } from "@/common/lib/utils"
import { X } from "lucide-react"
import { Button } from "@/common/components/ui/button"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

interface ModalHeaderProps {
  children: React.ReactNode
  className?: string
}

interface ModalContentProps {
  children: React.ReactNode
  className?: string
}

interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

const Modal = ({ isOpen, onClose, title, children, className }: ModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 h-screen z-[9999] flex items-center justify-center p-4">
      {/* Backdrop (no blur for crisper modal) */}
      <div 
        className="absolute inset-0 bg-black/70" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn(
        "relative bg-white text-foreground rounded-xl shadow-2xl border border-black/10 max-w-md w-full max-h-[90vh] overflow-hidden z-10",
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black/10">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  )
}

const ModalHeader = ({ children, className }: ModalHeaderProps) => {
  return (
    <div className={cn("px-6 py-4", className)}>
      {children}
    </div>
  )
}

const ModalContent = ({ children, className }: ModalContentProps) => {
  return (
    <div className={cn("px-6 py-4", className)}>
      {children}
    </div>
  )
}

const ModalFooter = ({ children, className }: ModalFooterProps) => {
  return (
    <div className={cn("flex items-center justify-end gap-2 px-6 py-4 border-t border-black/10", className)}>
      {children}
    </div>
  )}

export { Modal, ModalHeader, ModalContent, ModalFooter }
