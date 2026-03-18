import { Button, type ButtonProps } from "~/components/ui/button";
import { Spinner } from "./Spinner";
import { useSubmitLoading } from "~/hooks/useSubmitLoading";

interface SubmitButtonProps extends ButtonProps {
  loadingText?: string;
  formDataMatch?: Record<string, string>;
  spinnerSize?: "sm" | "md" | "lg";
  children?: React.ReactNode;
}

export function SubmitButton({
  loadingText,
  formDataMatch,
  spinnerSize = "sm",
  children,
  disabled,
  ...buttonProps
}: SubmitButtonProps) {

  const { isLoading } = useSubmitLoading(formDataMatch);

  return (
    <Button
      type="submit"
      disabled={isLoading || disabled}
      {...buttonProps}
    >
      {isLoading ? (
        <>
          <Spinner size={spinnerSize} />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
