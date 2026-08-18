"use client"

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"

import { cn } from "@/lib/utils"

/**
 * Accordion, on @base-ui/react — the same primitive library behind the tabs,
 * sidebar and dropdown in this kit. It was the one component the kit was
 * missing.
 *
 * Deliberately close to unstyled. The dashboard can style it with Tailwind, but
 * the storefront cannot: the template stylesheet (public/scss/_reset.scss) sets
 * bare-element rules UNLAYERED, and unlayered css outranks Tailwind's
 * @layer utilities no matter how specific the utility is. A trigger is a
 * <button>, which the template paints as a filled pill — exactly what happened
 * to the cart drawer's remove link. Storefront callers therefore pass plain
 * class names and style them in globals.css, also unlayered, where they can win
 * on specificity.
 *
 * The panel exposes --accordion-panel-height, which is what makes a real height
 * transition possible instead of snapping open.
 */

function Accordion({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn(className)}
      {...props}
    />
  )
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    // Header renders the heading element that makes the trigger a landmark for
    // screen readers; skipping it would leave the sections unnavigable.
    <AccordionPrimitive.Header data-slot="accordion-header">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(className)}
        {...props}
      >
        {children}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionPanel({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Panel>) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-panel"
      className={cn(className)}
      {...props}
    />
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionPanel }
