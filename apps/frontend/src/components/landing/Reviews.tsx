"use client";

import { useState } from "react";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Star, Quote } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { Input } from "@/common/components/ui/input";
import { useI18n } from "@/i18n/useI18n";
import { useLandingReviews, useCreateLandingReview } from "@/fetchers/public/reviewQueries";
import { toast } from "sonner";

export default function Reviews() {
  const { t } = useI18n();
  const { data, isLoading } = useLandingReviews(20);
  const [writeModalOpen, setWriteModalOpen] = useState(false);

  const reviews = data?.data ?? [];

  return (
    <section className="py-16 lg:py-24 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="text-center mb-16">
          <Badge className="bg-primary text-primary-foreground px-4 py-2 rounded-full mb-4">
            <Star className="w-4 h-4 mr-2" />
            {t("landing.reviews.badge")}
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {t("landing.reviews.title")}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t("landing.reviews.subtitle")}
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">
            Loading reviews...
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 text-gray-600 max-w-md mx-auto">
            {t("landing.reviews.emptyMessage")}
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8 mb-12">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        )}

        {/* Stats Section - optional, keep or remove */}
        {reviews.length > 0 && (
          <div className="grid md:grid-cols-4 gap-8 bg-white rounded-2xl p-8 shadow-lg mb-12">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">{reviews.length}+</div>
              <p className="text-gray-600">Reviews</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                {(reviews.reduce((a, r) => a + r.stars, 0) / reviews.length).toFixed(1)}/5
              </div>
              <p className="text-gray-600">Average Rating</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">24/7</div>
              <p className="text-gray-600">Customer Support</p>
            </div>
            <div className="text-center">
              <Button
                onClick={() => setWriteModalOpen(true)}
                variant="outline"
                className="border-primary text-primary"
              >
                {t("landing.reviews.writeReview")}
              </Button>
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="text-center mt-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Join Our Success Stories?
          </h3>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Start your journey with Poultry360 today and transform your poultry farming business like hundreds of other farmers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-lg"
              asChild
            >
              <a href="/auth/signup">Start Free Trial</a>
            </Button>
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-3 rounded-lg"
              onClick={() => setWriteModalOpen(true)}
            >
              {t("landing.reviews.writeReview")}
            </Button>
          </div>
        </div>
      </div>

      <WriteReviewModal
        open={writeModalOpen}
        onOpenChange={setWriteModalOpen}
      />
    </section>
  );
}

function ReviewCard({
  review,
}: {
  review: {
    id: string;
    name: string;
    business: string;
    address: string;
    stars: number;
    review: string;
    createdAt: string;
  };
}) {
  const initial = review.name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="relative bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
      <div className="absolute -top-4 left-8">
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-xl">{initial}</span>
        </div>
      </div>
      <div className="flex items-center mb-4 mt-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`w-5 h-5 ${i <= review.stars ? "text-yellow-400 fill-current" : "text-gray-200"}`}
          />
        ))}
      </div>
      <Quote className="w-8 h-8 text-primary mb-4 opacity-50" />
      <p className="text-gray-700 mb-6 leading-relaxed">&ldquo;{review.review}&rdquo;</p>
      <div className="border-t border-gray-100 pt-4">
        <h4 className="font-semibold text-gray-900">{review.name}</h4>
        <p className="text-sm text-gray-600">
          {review.business}
          {review.address ? `, ${review.address}` : ""}
        </p>
      </div>
    </div>
  );
}

function WriteReviewModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const createReview = useCreateLandingReview();
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [address, setAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createReview.mutateAsync({
        name: name.trim(),
        business: business.trim(),
        address: address.trim(),
        phoneNumber: phoneNumber.trim(),
        stars,
        review: review.trim(),
      });
      toast.success(t("landing.reviews.submitSuccess"));
      onOpenChange(false);
      setName("");
      setBusiness("");
      setAddress("");
      setPhoneNumber("");
      setStars(5);
      setReview("");
    } catch {
      // Error already toasted by axios/backend
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" showCloseButton>
        <DialogHeader>
          <DialogTitle>{t("landing.reviews.modalTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium text-gray-700">{t("landing.reviews.name")}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("landing.reviews.namePlaceholder")}
              className="mt-1"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">{t("landing.reviews.business")}</label>
            <Input
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              placeholder={t("landing.reviews.businessPlaceholder")}
              className="mt-1"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">{t("landing.reviews.address")}</label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("landing.reviews.addressPlaceholder")}
              className="mt-1"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">{t("landing.reviews.phoneNumber")}</label>
            <Input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder={t("landing.reviews.phoneNumberPlaceholder")}
              className="mt-1"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">{t("landing.reviews.stars")}</label>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStars(i)}
                  className="p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <Star
                    className={`w-8 h-8 ${i <= stars ? "text-yellow-400 fill-current" : "text-gray-300"}`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">{t("landing.reviews.review")}</label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder={t("landing.reviews.reviewPlaceholder")}
              className="mt-1 w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={createReview.isPending}
          >
            {createReview.isPending ? "..." : t("landing.reviews.submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
