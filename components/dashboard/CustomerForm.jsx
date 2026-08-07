"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CustomerForm({ customer, onSuccess, onCancel }) {
  const t = useTranslations("Dashboard");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    role: "CUSTOMER",
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        phone: customer.phone || "",
        role: customer.role || "CUSTOMER",
      });
    }
  }, [customer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer?.id) return; // Only updates are supported for now

    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update customer");
      }
    } catch (error) {
      console.error("Error updating customer:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-5">
        {/* Name */}
        <div className="grid gap-2">
          <Label htmlFor="name" className="text-start text-sm font-semibold text-muted-foreground">الاسم</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="اسم المستخدم"
            className="h-12 px-4 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl"
          />
        </div>

        {/* Phone */}
        <div className="grid gap-2">
          <Label htmlFor="phone" className="text-start text-sm font-semibold text-muted-foreground">رقم الهاتف</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="05XXXXXXXX"
            dir="ltr"
            className="text-right h-12 px-4 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl font-mono text-sm"
          />
        </div>

        {/* Role */}
        <div className="grid gap-2">
          <Label htmlFor="role" className="text-start text-sm font-semibold text-muted-foreground">الدور / الصلاحية</Label>
          <Select
            value={formData.role}
            onValueChange={(val) => setFormData({ ...formData, role: val })}
          >
            <SelectTrigger className="h-12 px-4 bg-muted/30 focus:ring-primary/20 transition-all rounded-xl">
              <SelectValue placeholder="اختر الصلاحية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CUSTOMER">عميل (Customer)</SelectItem>
              <SelectItem value="EMPLOYEE">موظف (Employee)</SelectItem>
              <SelectItem value="ADMIN">مدير (Admin)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-border/50">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="h-11 !px-8 rounded-xl font-medium !w-auto"
        >
          إلغاء
        </Button>
        <Button 
          type="submit" 
          disabled={loading}
          className="h-11 !px-10 rounded-xl font-bold shadow-sm !w-auto"
        >
          {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
        </Button>
      </div>
    </form>
  );
}
