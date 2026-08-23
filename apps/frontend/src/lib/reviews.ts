export interface LandingReview {
  id: string;
  name: string;
  business: string;
  address: string;
  stars: number;
  review: string;
  createdAt: string;
}

interface ReviewsApiResponse {
  success: boolean;
  data: LandingReview[];
}

export async function getPublishedLandingReviews(
  limit = 6,
): Promise<LandingReview[]> {
  const apiBase = (
    process.env.API_URL_INTERNAL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8081/api/v1"
  ).replace(/\/$/, "");

  const response = await fetch(`${apiBase}/public/reviews?limit=${limit}`, {
    headers: { "Content-Type": "application/json" },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Reviews API request failed: ${response.status}`);
  }

  const payload = (await response.json()) as ReviewsApiResponse;
  return Array.isArray(payload.data) ? payload.data : [];
}
