import React, { useState, useEffect, useRef } from 'react';
import { GameSaveSnapshot, SaveSlotMetadata } from '../types';
import { 
  getAllSaveSlotsMeta, saveGameToSlot, loadGameFromSlot, deleteSaveSlot, 
  restoreGameState, exportGameSaveFile, parseAndValidateSaveJson, 
  resetAllGameData, getCurrentActiveSlotIndex, getLastSavedTimestamp,
  recordSaveTimestamp
} from '../services/storageService';
import { audio } from '../services/audioService';
import { 
  Save, Download, Upload, Trash2, CheckCircle2, AlertTriangle, 
  X, RefreshCw, HardDrive, Clock, Shield, Coins, Trophy, Users,
  Sparkles, FileText, Check, AlertCircle, Edit2
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onStateRestored: () => void; // Trigger root state reload
  onSaveTriggered?: () => void;
}

export const SaveManagerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onStateRestored,
  onSaveTriggered,
}) => {
  const [slots, setSlots] = useState<SaveSlotMetadata[]>([]);
  const [activeSlot, setActiveSlot] = useState<number>(1);
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Slot name editing
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [editingSlotName, setEditingSlotName] = useState<string>('');

  // Import preview state
  const [importedData, setImportedData] = useState<GameSaveSnapshot | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset confirmation state
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Load slots on open
  const refreshSlots = () => {
    setSlots(getAllSaveSlotsMeta());
    setActiveSlot(getCurrentActiveSlotIndex());
    setLastSaved(getLastSavedTimestamp());
  };

  useEffect(() => {
    if (isOpen) {
      refreshSlots();
      setImportedData(null);
      setImportError(null);
      setShowResetConfirm(false);
    }
  }, [isOpen]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  if (!isOpen) return null;

  // Handle Quick Save into active slot
  const handleQuickSave = () => {
    try {
      audio.playClick();
      saveGameToSlot(activeSlot);
      refreshSlots();
      if (onSaveTriggered) onSaveTriggered();
      showToast(`Progress successfully saved to Slot ${activeSlot}!`, 'success');
    } catch (e) {
      showToast('Failed to save progress.', 'error');
    }
  };

  // Handle Save to specific slot
  const handleSaveToSlot = (slotIdx: number, customName?: string) => {
    try {
      audio.playClick();
      saveGameToSlot(slotIdx, customName);
      refreshSlots();
      if (onSaveTriggered) onSaveTriggered();
      showToast(`Progress successfully saved to Slot ${slotIdx}!`, 'success');
    } catch (e) {
      showToast(`Failed to save to Slot ${slotIdx}`, 'error');
    }
  };

  // Handle Load from specific slot
  const handleLoadSlot = (slotIdx: number) => {
    try {
      const snap = loadGameFromSlot(slotIdx);
      if (!snap) {
        showToast(`Slot ${slotIdx} is empty or corrupted`, 'error');
        return;
      }
      audio.playClick();
      restoreGameState(snap);
      refreshSlots();
      showToast(`Loaded save from Slot ${slotIdx}! Restarting squad engine...`, 'success');
      setTimeout(() => {
        onStateRestored();
        onClose();
      }, 500);
    } catch (e) {
      showToast(`Error loading save from Slot ${slotIdx}`, 'error');
    }
  };

  // Handle Delete slot
  const handleDeleteSlot = (slotIdx: number) => {
    if (window.confirm(`Are you sure you want to clear Slot ${slotIdx}? This cannot be undone.`)) {
      audio.playClick();
      deleteSaveSlot(slotIdx);
      refreshSlots();
      showToast(`Slot ${slotIdx} has been cleared`, 'info');
    }
  };

  // Handle Export to file
  const handleExport = (slotIdx?: number) => {
    try {
      audio.playClick();
      const snapshot = slotIdx ? loadGameFromSlot(slotIdx) || undefined : undefined;
      exportGameSaveFile(snapshot);
      showToast('Save file exported to your device downloads!', 'success');
    } catch (e) {
      showToast('Failed to export save file', 'error');
    }
  };

  // Handle File Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = parseAndValidateSaveJson(content);
      if (res.success && res.data) {
        setImportedData(res.data);
        setImportError(null);
      } else {
        setImportError(res.error || 'Invalid save file format');
        setImportedData(null);
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  // Confirm and apply imported file
  const handleApplyImportedData = () => {
    if (!importedData) return;
    try {
      audio.playClick();
      restoreGameState(importedData);
      showToast('Save file successfully restored!', 'success');
      setImportedData(null);
      setTimeout(() => {
        onStateRestored();
        onClose();
      }, 600);
    } catch (e) {
      showToast('Failed to restore imported save file', 'error');
    }
  };

  // Handle Complete Reset
  const handleConfirmReset = () => {
    audio.playClick();
    resetAllGameData();
    showToast('All game progress reset to factory starter pack.', 'info');
    setShowResetConfirm(false);
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  // Format date helper
  const formatTimeAgo = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-[#0A0E17] border border-gray-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#101726] to-[#0A0E17] border-b border-gray-800/80 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/50">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black italic uppercase text-white tracking-wide">
                  Save & Load Progress
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Auto-Save Active
                </span>
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span>Last saved: <strong className="text-gray-200">{formatTimeAgo(lastSaved)}</strong></span>
                <span>•</span>
                <span>Active Slot: <strong className="text-cyan-400">Slot {activeSlot}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleQuickSave}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black italic uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Quick Save</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#151B28] hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast Alert Banner */}
        {toastMessage && (
          <div className={`px-5 py-3 text-xs font-bold flex items-center gap-2.5 transition-all ${
            toastMessage.type === 'success' ? 'bg-emerald-950/80 text-emerald-300 border-b border-emerald-800/60' :
            toastMessage.type === 'error' ? 'bg-rose-950/80 text-rose-300 border-b border-rose-800/60' :
            'bg-cyan-950/80 text-cyan-300 border-b border-cyan-800/60'
          }`}>
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> :
             toastMessage.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" /> :
             <Sparkles className="w-4 h-4 shrink-0 text-cyan-400" />}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1 scrollbar-thin">
          
          {/* Section: Save Slots */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black italic uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                <span>Memory Save Slots (3 Available)</span>
              </h3>
              <span className="text-[11px] text-gray-500 font-medium">
                Save distinct campaigns or career timelines
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {slots.map((slot) => {
                const isActive = activeSlot === slot.slotIndex;
                const isEditing = editingSlotIndex === slot.slotIndex;

                return (
                  <div
                    key={slot.slotIndex}
                    className={`rounded-2xl border p-4 transition-all ${
                      slot.isOccupied
                        ? isActive
                          ? 'bg-[#101726] border-cyan-500/60 shadow-lg shadow-cyan-950/40'
                          : 'bg-[#0E131F] border-gray-800 hover:border-gray-700'
                        : 'bg-[#090D14]/60 border-dashed border-gray-800/80'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Slot info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono tracking-wider ${
                            isActive 
                              ? 'bg-cyan-500 text-black font-black' 
                              : slot.isOccupied ? 'bg-[#1C2436] text-gray-300' : 'bg-gray-800/50 text-gray-500'
                          }`}>
                            Slot {slot.slotIndex}
                          </span>

                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingSlotName}
                                onChange={(e) => setEditingSlotName(e.target.value)}
                                className="bg-[#151B28] border border-cyan-500 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => {
                                  handleSaveToSlot(slot.slotIndex, editingSlotName.trim() || undefined);
                                  setEditingSlotIndex(null);
                                }}
                                className="p-1 rounded bg-cyan-600 text-white hover:bg-cyan-500 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                              {slot.slotName}
                              {slot.isOccupied && (
                                <button
                                  onClick={() => {
                                    setEditingSlotIndex(slot.slotIndex);
                                    setEditingSlotName(slot.slotName);
                                  }}
                                  className="text-gray-500 hover:text-cyan-400 p-0.5 transition-colors cursor-pointer"
                                  title="Rename slot"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                            </span>
                          )}

                          {isActive && (
                            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
                              Current Active
                            </span>
                          )}
                        </div>

                        {slot.isOccupied ? (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Shield className="w-3.5 h-3.5 text-cyan-400" />
                              <strong className="text-gray-200">{slot.clubName}</strong>
                              <span className="text-cyan-300 font-mono">({slot.squadOvr} OVR)</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                              <span>MD {slot.currentMatchday || 1}/38</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5 text-yellow-400" />
                              <span className="font-mono">{slot.coins?.toLocaleString() || 0}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-purple-400" />
                              <span>{slot.totalCards || 0} Cards</span>
                            </span>
                            <span className="text-gray-500 text-[11px]">
                              Saved: {formatTimeAgo(slot.timestamp)}
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 italic">
                            Empty slot — Ready to store your squad and campaign progress.
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {slot.isOccupied ? (
                          <>
                            <button
                              onClick={() => handleLoadSlot(slot.slotIndex)}
                              className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                              title="Load this save state"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => handleSaveToSlot(slot.slotIndex)}
                              className="px-3 py-1.5 rounded-xl bg-[#182030] hover:bg-[#202b40] border border-gray-700 text-gray-300 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                              title="Overwrite with current progress"
                            >
                              Overwrite
                            </button>
                            <button
                              onClick={() => handleExport(slot.slotIndex)}
                              className="p-2 rounded-xl bg-[#151B28] hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
                              title="Export slot to file"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSlot(slot.slotIndex)}
                              className="p-2 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                              title="Delete this save"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleSaveToSlot(slot.slotIndex)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow transition-all cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Here</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: File Backup & Restore (Export / Import) */}
          <div className="rounded-2xl border border-gray-800 bg-[#0E131F] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black italic uppercase tracking-wider text-gray-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Device Backup & Cloud File Sync</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Export your entire career progress to a portable JSON backup or restore a previous file on any device.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Export Card */}
              <button
                onClick={() => handleExport()}
                className="p-4 rounded-xl bg-[#131926] border border-gray-800 hover:border-cyan-500/40 text-left transition-all group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2.5 text-cyan-400 font-bold text-xs uppercase tracking-wider mb-1">
                    <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                    <span>Download Save Backup (.json)</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Saves full club profile, 38-match season fixtures & standings, player inventory, and market orders into a safe local file.
                  </p>
                </div>
                <div className="mt-3 text-[10px] text-gray-500 font-mono">
                  Format: APEX-17 JSON Save v1.5
                </div>
              </button>

              {/* Import Card */}
              <div className="p-4 rounded-xl bg-[#131926] border border-gray-800 hover:border-cyan-500/40 text-left transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 text-purple-400 font-bold text-xs uppercase tracking-wider mb-1">
                    <Upload className="w-4 h-4" />
                    <span>Restore From File</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Select a previously exported save file (.json) to restore your team progress.
                  </p>
                </div>
                
                <div className="mt-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json,application/json"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 rounded-lg bg-[#1D2538] hover:bg-[#253048] border border-gray-700 text-xs font-bold text-gray-200 uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5 text-purple-400" />
                    <span>Browse File</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Imported File Preview */}
            {importedData && (
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/40 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Save File Validated Ready to Restore</span>
                  </div>
                  <button
                    onClick={() => setImportedData(null)}
                    className="text-gray-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-[#0F1422] p-3 rounded-lg border border-purple-900/30">
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Club Name</span>
                    <span className="font-bold text-white">{importedData.clubName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Squad Rating</span>
                    <span className="font-bold text-cyan-400 font-mono">{importedData.squadOvr} OVR</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Season Matchday</span>
                    <span className="font-bold text-yellow-400 font-mono">MD {importedData.currentSeasonMatchday || 1}/38</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Players</span>
                    <span className="font-bold text-gray-200">{importedData.totalCardsCount || importedData.inventory?.length} Cards</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => setImportedData(null)}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs font-bold uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyImportedData}
                    className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black italic uppercase tracking-wider flex items-center gap-1.5 shadow cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Apply & Load Progress</span>
                  </button>
                </div>
              </div>
            )}

            {importError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{importError}</span>
              </div>
            )}
          </div>

          {/* Danger Zone: Reset Career */}
          <div className="rounded-2xl border border-rose-950/40 bg-rose-950/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>New Career / Reset All Game Data</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Clear all active squad, season standings, coins, and cards to start a completely fresh career with starter packs.
              </p>
            </div>

            {showResetConfirm ? (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-rose-300 font-bold">Are you sure?</span>
                <button
                  onClick={handleConfirmReset}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Yes, Reset
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-950/60 border border-rose-900/50 text-rose-400 hover:text-rose-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
              >
                Reset Progress
              </button>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#0A0E17] border-t border-gray-800/80 p-4 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>APEX 27 Safe Progress Storage</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#151B28] hover:bg-gray-800 text-gray-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
