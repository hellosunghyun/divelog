import { useNavigation } from "react-router";

export function useSubmitLoading(formDataMatch?: Record<string, string>) {
  const navigation = useNavigation();

  if (navigation.state !== "submitting") {
    return { isLoading: false };
  }

  if (!formDataMatch) {
    return { isLoading: true };
  }

  // Check if all key-value pairs in formDataMatch match the current formData
  const matches = Object.entries(formDataMatch).every(([key, value]) => {
    return navigation.formData?.get(key) === value;
  });

  return { isLoading: matches };
}
