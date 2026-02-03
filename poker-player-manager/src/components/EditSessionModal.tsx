import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus,
  Minus,
  Users,
  User,
  Clock,
  UserPlus,
  Edit,
  AlertCircle
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EditSessionModalProps } from '../types/index';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Common timezone options
const timezoneOptions = [
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
  { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
  { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKST/AKDT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'UTC', label: 'UTC' },
];

// Helper function to get the nearest Saturday 3 weeks from today at 7pm
const getDefaultSessionDate = (): string => {
  const today = new Date();
  const threeWeeksFromToday = new Date(today.getTime() + (3 * 7 * 24 * 60 * 60 * 1000));

  // Find the nearest Saturday (6 = Saturday)
  let nearestSaturday = new Date(threeWeeksFromToday);
  const dayOfWeek = threeWeeksFromToday.getDay();

  if (dayOfWeek === 6) {
    // Already Saturday
    nearestSaturday = threeWeeksFromToday;
  } else if (dayOfWeek < 6) {
    // Before Saturday this week
    const daysToSaturday = 6 - dayOfWeek;
    nearestSaturday = new Date(threeWeeksFromToday.getTime() + (daysToSaturday * 24 * 60 * 60 * 1000));
  } else {
    // After Saturday, go to next Saturday
    const daysToNextSaturday = 7 - dayOfWeek + 6;
    nearestSaturday = new Date(threeWeeksFromToday.getTime() + (daysToNextSaturday * 24 * 60 * 60 * 1000));
  }

  // Set time to 7:00 PM
  nearestSaturday.setHours(19, 0, 0, 0);

  // Return in datetime-local format (YYYY-MM-DDTHH:MM)
  // Use local time instead of UTC to avoid timezone issues
  const year = nearestSaturday.getFullYear();
  const month = String(nearestSaturday.getMonth() + 1).padStart(2, '0');
  const day = String(nearestSaturday.getDate()).padStart(2, '0');
  const hours = String(nearestSaturday.getHours()).padStart(2, '0');
  const minutes = String(nearestSaturday.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

function EditSessionModal({ open, onClose, onUpdateSession, players, session }: EditSessionModalProps): React.JSX.Element {
  const [sessionName, setSessionName] = useState<string>('Poker Night');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [scheduledDateTime, setScheduledDateTime] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('America/Los_Angeles');

  // Initialize form with session data when modal opens
  useEffect(() => {
    if (session && open) {
      setSessionName(session.name || 'Poker Night');
      setSelectedPlayerIds(session.players?.map(sp => sp.player_id) || []);
      setTimezone(session.timezone || 'America/Los_Angeles');
      if (session.scheduledDateTime) {
        const sessionDate = new Date(session.scheduledDateTime);
        const year = sessionDate.getFullYear();
        const month = String(sessionDate.getMonth() + 1).padStart(2, '0');
        const day = String(sessionDate.getDate()).padStart(2, '0');
        const hours = String(sessionDate.getHours()).padStart(2, '0');
        const minutes = String(sessionDate.getMinutes()).padStart(2, '0');
        setScheduledDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
      } else {
        setScheduledDateTime(getDefaultSessionDate());
      }
    }
  }, [session, open]);

  const handleClose = (): void => {
    setSessionName('Poker Night');
    setSelectedPlayerIds([]);
    setScheduledDateTime(getDefaultSessionDate());
    onClose();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (session && scheduledDateTime) {
      // Use session name if provided, otherwise default to "Poker Night"
      const finalSessionName = sessionName.trim() || 'Poker Night';
      // Convert datetime-local to ISO string
      const isoDateTime = new Date(scheduledDateTime).toISOString();
      onUpdateSession(session.id, finalSessionName, selectedPlayerIds, isoDateTime, timezone);
      handleClose();
    }
  };



  const handleAddPlayer = (playerId: number): void => {
    if (!selectedPlayerIds.includes(playerId)) {
      setSelectedPlayerIds([...selectedPlayerIds, playerId]);
    }
  };

  const handleRemovePlayer = (playerId: number): void => {
    setSelectedPlayerIds(selectedPlayerIds.filter(id => id !== playerId));
  };

  const handleInviteAll = (): void => {
    // Only invite players with default_invite = true (or undefined for backward compatibility) AND email addresses
    const playersToInvite = players.filter(player =>
      player.default_invite !== false && player.email !== null
    );
    setSelectedPlayerIds(playersToInvite.map(player => player.id));
  };

  const availablePlayers = players.filter(player =>
    !selectedPlayerIds.includes(player.id) && player.email !== null
  )

  const selectedPlayers = players.filter(player =>
    selectedPlayerIds.includes(player.id)
  )

  if (!session) return <></>

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
            <Edit className="h-6 w-6 text-primary" />
            Edit Session
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="session-name" className="text-sm font-medium">
                Session Name
              </label>
              <Input
                id="session-name"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Defaults to 'Poker Night'"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="scheduled-datetime" className="text-sm font-medium">
                Scheduled Date & Time *
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="scheduled-datetime"
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="timezone" className="text-sm font-medium">
                Time Zone
              </label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select timezone" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {timezoneOptions.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Select Players
            </h3>

            {availablePlayers.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleInviteAll}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite All
              </Button>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Available Players */}
            <div className="flex-1">
              <h4 className="text-sm font-medium mb-2">
                Available Players ({availablePlayers.length})
              </h4>
              <div className="border rounded-lg bg-gray-50 dark:bg-gray-800 max-h-48 overflow-y-auto">
                {availablePlayers.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      {players.length === 0
                        ? 'No players available. Add players first.'
                        : 'All players have been added to this session.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="p-2">
                    <TooltipProvider>
                      {availablePlayers.map(player => (
                        <div key={player.id} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{player.name}</span>
                            {player.default_invite === false && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertCircle className="h-3 w-3 text-orange-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Excluded from "Invite All" - must be added manually</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddPlayer(player.id)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </TooltipProvider>
                  </div>
                )}
              </div>
            </div>

            {/* Selected Players */}
            <div className="flex-1">
              <h4 className="text-sm font-medium mb-2">
                Selected Players ({selectedPlayers.length})
              </h4>
              <div className="border rounded-lg bg-blue-50 dark:bg-blue-950 max-h-48 overflow-y-auto">
                {selectedPlayers.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      No players selected yet.
                    </p>
                  </div>
                ) : (
                  <div className="p-2">
                    {selectedPlayers.map(player => (
                      <div key={player.id} className="flex items-center justify-between p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          <span className="text-sm">{player.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemovePlayer(player.id)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!scheduledDateTime}
            >
              <Edit className="h-4 w-4 mr-2" />
              Update Session
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default EditSessionModal;
