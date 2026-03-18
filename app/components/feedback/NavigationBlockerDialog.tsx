import type { Blocker } from "react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

interface NavigationBlockerDialogProps {
  blocker: Blocker;
}

export function NavigationBlockerDialog({ blocker }: NavigationBlockerDialogProps) {
  if (blocker.state !== "blocked") return null;

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) blocker.reset(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>작성 중인 내용이 있습니다</AlertDialogTitle>
          <AlertDialogDescription>
            이 페이지를 떠나면 작성 중인 내용이 사라질 수 있습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => blocker.reset()}>
            머무르기
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => blocker.proceed()}>
            떠나기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
