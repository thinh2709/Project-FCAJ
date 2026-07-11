"use client";

import { useState, useEffect } from "react";
import { useAdminMatches, useAdminQueue } from "@/features/admin/hooks/useAdmin";
import { LoadingState } from "@/shared/components/LoadingState";
import { ErrorState } from "@/shared/components/ErrorState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, UserCheck } from "lucide-react";
import { getEventTitle } from "@/lib/utils";

export default function AdminQueuePage() {
  const { matches, loading: matchesLoading, error: matchesError } = useAdminMatches();
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [allowCount, setAllowCount] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);

  const { queueStats, autoConfig, loading: queueLoading, error: queueError, refetch: queueRefetch, allowUsers, updateAutoConfig, resetQueue } = useAdminQueue(selectedMatchId || null);

  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoMaxUsersCount, setAutoMaxUsersCount] = useState<number | "">("");

  // Sync auto config when loaded
  useEffect(() => {
    if (autoConfig) {
      setAutoEnabled(autoConfig.enabled);
      setAutoMaxUsersCount(autoConfig.maxUsers);
    }
  }, [autoConfig]);

  if (matchesLoading) return <LoadingState text="Loading matches..." />;
  if (matchesError) return <ErrorState description={matchesError} />;

  const handleAllowUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowCount || allowCount <= 0) return;

    setSubmitting(true);
    try {
      await allowUsers(Number(allowCount));
      setAllowCount("");
    } catch (err) {
      // Error handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAutoConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!autoMaxUsersCount || autoMaxUsersCount <= 0) return;

    setSubmitting(true);
    try {
      await updateAutoConfig({
        enabled: autoEnabled,
        maxUsers: Number(autoMaxUsersCount),
      });
    } catch (err) {
      // Error handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Queue Management</h2>
          <p className="text-muted-foreground">Manage user queue for high-demand matches.</p>
        </div>
        {selectedMatchId && (
          <Button
            variant="destructive"
            onClick={async () => {
              if (confirm("Are you sure you want to completely reset and clear the virtual queue for this match? This will clear all waiting and allowed users.")) {
                try {
                  await resetQueue();
                } catch (err) { }
              }
            }}
          >
            Reset Queue
          </Button>
        )}
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Select Match</CardTitle>
          <CardDescription>Choose a match to manage its virtual queue.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Label htmlFor="match-select">Match</Label>
            <select
              id="match-select"
              className="flex h-9 w-full rounded-md border border-input bg-[#151515] text-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedMatchId}
              onChange={(e) => setSelectedMatchId(e.target.value)}
            >
              <option value="" disabled className="bg-[#151515] text-gray-400">Select a match</option>
              {matches.map((match) => (
                <option key={match.id} value={match.id} className="bg-[#151515] text-white">
                  {getEventTitle(match.team_a, match.team_b)} ({new Date(match.match_date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {selectedMatchId && (
        <div className="grid gap-4 md:grid-cols-2 max-w-4xl">
          {queueLoading && !queueStats ? (
            <div className="col-span-2">
              <LoadingState text="Loading queue stats..." />
            </div>
          ) : queueError ? (
            <div className="col-span-2">
              <ErrorState description={queueError} action={<Button onClick={queueRefetch} variant="outline">Retry</Button>} />
            </div>
          ) : queueStats ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Waiting Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{queueStats.waitingUsers}</div>
                  <p className="text-xs text-muted-foreground mt-1">Users currently in the virtual queue</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Allowed Users</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{queueStats.currentAllowedUsers}</div>
                  <p className="text-xs text-muted-foreground mt-1">Users who can proceed to booking</p>
                </CardContent>
              </Card>

              <Card className="col-span-2 mt-2">
                <CardHeader>
                  <CardTitle>Allow Users</CardTitle>
                  <CardDescription>Grant access to a specific number of waiting users to proceed with booking.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAllowUsers} className="flex gap-4 items-end">
                    <div className="grid gap-2 flex-1">
                      <Label htmlFor="allow-count">Number of Users to Allow</Label>
                      <Input
                        id="allow-count"
                        type="number"
                        min="1"
                        max={queueStats.waitingUsers || 1000}
                        value={allowCount}
                        onChange={(e) => setAllowCount(e.target.value ? Number(e.target.value) : "")}
                        placeholder="e.g. 50"
                        disabled={submitting || queueStats.waitingUsers === 0}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={submitting || !allowCount || queueStats.waitingUsers === 0}
                    >
                      {submitting ? "Allowing..." : "Allow Users"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="col-span-2 mt-2">
                <CardHeader>
                  <CardTitle>Auto-Queue Throttling</CardTitle>
                  <CardDescription>Automatically maintain a target number of allowed users in the booking page.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveAutoConfig} className="flex gap-4 items-end">
                    <div className="flex items-center space-x-2 pb-2">
                      <input
                        type="checkbox"
                        id="auto-queue-mode"
                        className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                        checked={autoEnabled}
                        onChange={(e) => setAutoEnabled(e.target.checked)}
                        disabled={submitting}
                      />
                      <Label htmlFor="auto-queue-mode" className="cursor-pointer">Enable Auto-Queue</Label>
                    </div>
                    <div className="grid gap-2 flex-1">
                      <Label htmlFor="auto-max">Target Concurrent Users</Label>
                      <Input
                        id="auto-max"
                        type="number"
                        min="1"
                        value={autoMaxUsersCount}
                        onChange={(e) => setAutoMaxUsersCount(e.target.value ? Number(e.target.value) : "")}
                        placeholder="e.g. 50"
                        disabled={submitting || !autoEnabled}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={submitting}
                    >
                      {submitting ? "Saving..." : "Save Config"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
