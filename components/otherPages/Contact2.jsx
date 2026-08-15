"use client";
import React, { useRef, useState } from "react";
import emailjs from "@emailjs/browser";
import { useTranslations } from "next-intl";
import { siteContact, telHref } from "@/data/siteContact";

export default function Contact2() {
  const formRef = useRef();
  const [success, setSuccess] = useState(true);
  const [showMessage, setShowMessage] = useState(false);
  const t = useTranslations("contact");

  const handleShowMessage = () => {
    setShowMessage(true);
    setTimeout(() => {
      setShowMessage(false);
    }, 2000);
  };

  const sendMail = (e) => {
    e.preventDefault();
    emailjs
      .sendForm("service_noj8796", "template_fs3xchn", formRef.current, {
        publicKey: "iG4SCmR-YtJagQ4gV",
      })
      .then((res) => {
        if (res.status === 200) {
          setSuccess(true);
          handleShowMessage();

          formRef.current.reset();
        } else {
          setSuccess(false);
          handleShowMessage();
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };
  return (
    <section className="flat-spacing">
      <div className="container">
        <div className="contact-us-content">
          <div className="left">
            <h4>{t("getInTouch")}</h4>
            <p className="text-secondary-2">
              {t("getInTouchDesc")}
            </p>
            <div
              className={`tfSubscribeMsg  footer-sub-element ${
                showMessage ? "active" : ""
              }`}
            >
              {success ? (
                <p style={{ color: "rgb(52, 168, 83)" }}>
                  {t("successMsg")}
                </p>
              ) : (
                <p style={{ color: "red" }}>{t("errorMsg")}</p>
              )}
            </div>
            <form
              onSubmit={sendMail}
              ref={formRef}
              id="contactform"
              className="form-leave-comment"
            >
              <div className="wrap">
                <div className="cols">
                  <fieldset className="">
                    <input
                      className=""
                      type="text"
                      placeholder={t("namePlaceholder")}
                      name="name"
                      id="name"
                      tabIndex={2}
                      defaultValue=""
                      aria-required="true"
                      required
                    />
                  </fieldset>
                  <fieldset className="">
                    <input
                      className=""
                      type="email"
                      placeholder={t("emailPlaceholder")}
                      name="email"
                      id="email"
                      tabIndex={2}
                      defaultValue=""
                      aria-required="true"
                      required
                    />
                  </fieldset>
                </div>
                <fieldset className="">
                  <textarea
                    name="message"
                    id="message"
                    rows={4}
                    placeholder={t("messagePlaceholder")}
                    tabIndex={2}
                    aria-required="true"
                    required
                    defaultValue={""}
                  />
                </fieldset>
              </div>
              <div className="button-submit send-wrap">
                <button className="tf-btn btn-fill" type="submit">
                  <span className="text text-button">{t("submitBtn")}</span>
                </button>
              </div>
            </form>
          </div>
          <div className="right">
            <h4>{t("info")}</h4>
            {/* Read from data/siteContact.js, not from the message files: the
                translations carried the template's US demo data, so the Arabic
                page advertised a North Carolina address and a +1 number. Rows
                stay hidden until real values are configured. */}
            {siteContact.phone && (
              <div className="mb_20">
                <div className="text-title mb_8">{t("phoneTitle")}</div>
                <p className="text-secondary" dir="ltr">
                  <a href={telHref(siteContact.phone)}>{siteContact.phone}</a>
                </p>
              </div>
            )}
            {siteContact.email && (
              <div className="mb_20">
                <div className="text-title mb_8">{t("emailTitle")}</div>
                <p className="text-secondary">
                  <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a>
                </p>
              </div>
            )}
            {siteContact.address && (
              <div className="mb_20">
                <div className="text-title mb_8">{t("addressTitle")}</div>
                <p className="text-secondary">{siteContact.address}</p>
              </div>
            )}
            {siteContact.openingHours && (
              <div>
                <div className="text-title mb_8">{t("openTimeTitle")}</div>
                <p className="open-time">{siteContact.openingHours}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
