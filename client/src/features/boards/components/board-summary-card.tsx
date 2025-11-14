import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Archive,
  Calendar,
  FolderKanban,
  MoreVertical,
  Settings,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import type { BoardSummary } from "@/api/gen/model";

export function BoardSummaryCard({ board }: { board: BoardSummary }) {
  const progress =
    board.totalTasks > 0
      ? Math.round((board.completedTasks / board.totalTasks) * 100)
      : 0;

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="line-clamp-1">{board.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {board.description || "No description provided"}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {board.isDefault ? (
                <DropdownMenuItem>
                  <Star className="text-primary fill-primary mr-2 h-4 w-4" />
                  Default Board
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem>
                  <Star className="mr-2 h-4 w-4" />
                  Set as Default
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-3">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="bg-secondary h-2 w-full rounded-full">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          {/* Stats */}
          <div className="flex justify-between text-sm">
            <div className="text-muted-foreground flex items-center gap-1">
              <FolderKanban className="h-3 w-3" />
              <span>{board.totalTasks} tasks</span>
            </div>
            <div className="text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{board.completedTasks} done</span>
            </div>
          </div>
          {/* Last Activity */}
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            <Calendar className="h-3 w-3" />
            <span>
              Updated {new Date(board.dateModified).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button asChild className="w-full">
          <Link to="/boards/$boardId" params={{ boardId: String(board.id) }}>
            Open Board
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
