import React from "react";

/**
 * Storefront footer.
 *
 * Reduced to a single copyright line, deliberately.
 *
 * What it replaced: a newsletter form, three columns of links (four of which
 * 404'd), six social icons all pointing at "#", six payment-card logos for
 * cards the shop does not accept, a duplicate language and currency switcher
 * already present in the topbar, and the template's US address. None of it was
 * doing any work; all of it was asking for attention on every page.
 *
 * `hasPaddingBottom` is kept because the product detail page passes it to clear
 * its sticky add-to-cart bar. `border` and `dark` were only ever passed as
 * their defaults, so they are gone.
 *
 * A server component now: with the newsletter form removed there is no state,
 * no effect and no handler left, so this no longer ships any JavaScript.
 */
export default function Footer1({ hasPaddingBottom = false }) {
  return (
    <footer
      className="site-footer"
      style={{ paddingBottom: hasPaddingBottom ? "96px" : undefined }}
    >
      <div className="container">
        <p className="site-footer__line">
          © {new Date().getFullYear()} Fit Women Heels
          <span className="site-footer__sep" aria-hidden="true">
            ·
          </span>
          <span className="site-footer__muted">All rights reserved</span>
        </p>
      </div>
    </footer>
  );
}
