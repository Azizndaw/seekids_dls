import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar } from "lucide-react";

interface Delay {
  id: number;
  date: string;
  discipline: { id: string; name: string };
}

interface DelaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  delays: Delay[];
}

const DelaysModal = ({ isOpen, onClose, delays }: DelaysModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
            <Clock className="h-5 w-5 text-red-600 dark:text-red-400" />
            <span>Détails des retards</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {delays.map((delay) => (
            <div
              key={delay.id}
              className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-gray-900 dark:text-white">{delay.date}</div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Matière :</span>
                  <span>{(delay.discipline?.name || delay.disciplineName)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DelaysModal;
