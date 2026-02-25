"use client";

import { Button } from "@/common/components/ui/button";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";

export default function Contact() {
  const { t } = useI18n();

  return (
    <section id="contact" className="bg-gray-50 py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {t("landing.contact.title")}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t("landing.contact.subtitle")}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">{t("landing.contact.sendMessage")}</h3>
            <form className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    {t("landing.contact.firstName")}
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder={t("landing.contact.firstNamePlaceholder")}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    {t("landing.contact.lastName")}
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder={t("landing.contact.lastNamePlaceholder")}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  {t("landing.contact.email")}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder={t("landing.contact.emailPlaceholder")}
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  {t("landing.contact.phone")}
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                  placeholder={t("landing.contact.phonePlaceholder")}
                />
              </div>

              <div>
                <label htmlFor="farmType" className="block text-sm font-medium text-gray-700 mb-2">
                  {t("landing.contact.farmType")}
                </label>
                <select
                  id="farmType"
                  name="farmType"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">{t("landing.contact.farmTypePlaceholder")}</option>
                  <option value="broiler">{t("landing.contact.farmBroiler")}</option>
                  <option value="layer">{t("landing.contact.farmLayer")}</option>
                  <option value="hatchery">{t("landing.contact.farmHatchery")}</option>
                  <option value="feed-dealer">{t("landing.contact.farmFeedDealer")}</option>
                  <option value="mixed">{t("landing.contact.farmMixed")}</option>
                  <option value="other">{t("landing.contact.farmOther")}</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  {t("landing.contact.message")}
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  placeholder={t("landing.contact.messagePlaceholder")}
                  required
                ></textarea>
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg flex items-center justify-center">
                <Send className="w-5 h-5 mr-2" />
                {t("landing.contact.sendBtn")}
              </Button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">{t("landing.contact.contactInfo")}</h3>
              <p className="text-gray-600 mb-8">
                {t("landing.contact.contactInfoDesc")}
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{t("landing.contact.emailLabel")}</h4>
                  <p className="text-gray-600">info@poultry360.com</p>
                  <p className="text-gray-600">support@poultry360.com</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{t("landing.contact.phoneLabel")}</h4>
                  <p className="text-gray-600">+91 98765 43210</p>
                  <p className="text-gray-600">+91 98765 43211</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{t("landing.contact.officeLabel")}</h4>
                  <p className="text-gray-600">Poultry360 Solutions Pvt. Ltd.</p>
                  <p className="text-gray-600">123 Farm Tech Park, Sector 15</p>
                  <p className="text-gray-600">Gurgaon, Haryana 122001</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md">
              <h4 className="font-semibold text-gray-900 mb-3">{t("landing.contact.businessHours")}</h4>
              <div className="space-y-2 text-gray-600">
                <div className="flex justify-between">
                  <span>{t("landing.contact.monFri")}</span>
                  <span>9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("landing.contact.saturday")}</span>
                  <span>9:00 AM - 2:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("landing.contact.sunday")}</span>
                  <span>{t("landing.contact.closed")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
