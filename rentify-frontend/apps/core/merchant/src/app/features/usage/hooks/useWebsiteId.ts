import { useWebsiteData } from "@rentify/shared/context/WebsiteContext";

export const useWebsiteId = () => {
  const { websiteId, isLoading } = useWebsiteData();
  return { websiteId, isLoading };
};
