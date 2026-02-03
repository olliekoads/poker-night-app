import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Users, Link, Check } from 'lucide-react';
import { Session, Player, PlayerStatus } from '../types/index';
import PlayerStatusBadge from './PlayerStatusBadge';
import PlayerStatusSelector from './PlayerStatusSelector';
import { getStatusPriority } from '../utils/playerSorting';

interface SessionPlayerListProps {
  session: Session;
  players: Player[];
  onStatusChange?: (playerId: number, newStatus: PlayerStatus) => void;
  readonly?: boolean;
}

function SessionPlayerList({
  session,
  players,
  onStatusChange,
  readonly = false
}: SessionPlayerListProps): React.JSX.Element {
  const [copiedPlayerId, setCopiedPlayerId] = useState<number | null>(null);
  // Get players that are in this session
  const sessionPlayers = players.filter(player =>
    session.players?.some(sp => sp.player_id === player.id)
  );

  // Get player status from session data
  const getPlayerStatus = (playerId: number): PlayerStatus => {
    if (session.players) {
      const sessionPlayer = session.players.find(sp => sp.player_id === playerId);
      return sessionPlayer?.status || 'Invited';
    }
    return 'Invited';
  };



  // Sort session players by status priority
  const sortedSessionPlayers = sessionPlayers.sort((a, b) => {
    const statusA = getPlayerStatus(a.id);
    const statusB = getPlayerStatus(b.id);
    return getStatusPriority(statusA) - getStatusPriority(statusB);
  });

  const handleStatusChange = (playerId: number, newStatus: PlayerStatus) => {
    if (onStatusChange) {
      onStatusChange(playerId, newStatus);
    }
  };

  const generateInviteUrl = (player: Player): string => {
    if (!player.email) return '';

    const encodedEmail = btoa(player.email);
    const baseUrl = window.location.origin;
    return `${baseUrl}/invite/${session.id}/${encodedEmail}`;
  };

  const handleCopyInviteUrl = async (player: Player) => {
    if (!player.email) {
      alert('Player must have an email address to generate invite link');
      return;
    }

    const inviteUrl = generateInviteUrl(player);

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedPlayerId(player.id);

      // Clear the copied state after 2 seconds
      setTimeout(() => {
        setCopiedPlayerId(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy invite URL:', err);
      // Fallback: show the URL in an alert
      alert(`Invite URL: ${inviteUrl}`);
    }
  };

  if (sessionPlayers.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            No players in this session
          </h3>
          <p className="text-sm text-muted-foreground">
            Add players when creating or editing the session
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-primary text-primary-foreground py-3 sm:py-6">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Users className="h-4 w-4 sm:h-5 sm:w-5" />
          Players ({sessionPlayers.length})
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y">
          {sortedSessionPlayers.map((player) => {
            const playerStatus = getPlayerStatus(player.id);

            return (
              <div
                key={player.id}
                className="flex items-center p-3 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center mr-2 sm:mr-4 flex-shrink-0">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
                </div>

                <div className="flex-1 min-w-0 mr-2">
                  <h4 className="text-sm sm:text-base font-medium text-foreground truncate">
                    {player.name}
                  </h4>
                </div>

                <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
                  <div>
                    {readonly ? (
                      <PlayerStatusBadge status={playerStatus} />
                    ) : (
                      <PlayerStatusSelector
                        status={playerStatus}
                        onStatusChange={(newStatus) => handleStatusChange(player.id, newStatus)}
                      />
                    )}
                  </div>

                  {/* Invite URL Button */}
                  <Button
                    onClick={() => handleCopyInviteUrl(player)}
                    variant="ghost"
                    size="sm"
                    disabled={!player.email}
                    className={`h-7 w-7 sm:h-8 sm:w-8 p-0 ${
                      copiedPlayerId === player.id
                        ? 'text-green-600 hover:text-green-700'
                        : 'text-blue-600 hover:text-blue-700'
                    }`}
                    title={
                      !player.email
                        ? 'Player needs email address for invite link'
                        : copiedPlayerId === player.id
                        ? 'Invite URL copied!'
                        : 'Copy invite URL'
                    }
                  >
                    {copiedPlayerId === player.id ? (
                      <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                    ) : (
                      <Link className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default SessionPlayerList;
