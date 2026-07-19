"use client";

import {
  AlertTriangle,
  BarChart3,
  Boxes,
  FileBarChart,
  FileText,
  GraduationCap,
  Handshake,
  HeartHandshake,
  LayoutGrid,
  LifeBuoy,
  PiggyBank,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";
import type { ModuleManifest, ModuleNavItem } from "@/modules/types";
import { NAV_GROUPS } from "@/modules/nav/groups";

const COMING_SOON_BADGE = "Em breve";

const comingSoon = (
  item: Omit<ModuleNavItem, "disabled" | "badge">,
): ModuleNavItem => ({
  ...item,
  disabled: true,
  badge: COMING_SOON_BADGE,
  rolesAny: ["Admin"],
});

export const sidebarPlaceholderManifests: ModuleManifest[] = [
  {
    key: "sidebar-placeholders:painel",
    groupLabel: NAV_GROUPS.PAINEL,
    navItems: [
      comingSoon({
        title: "Recursos",
        href: "/coming-soon/analytics-resources",
        icon: BarChart3,
        order: 20,
      }),
      comingSoon({
        title: "Ações",
        href: "/coming-soon/analytics-actions",
        icon: BarChart3,
        order: 30,
      }),
    ],
  },
  {
    key: "sidebar-placeholders:gestao",
    groupLabel: NAV_GROUPS.GESTAO,
    navItems: [
      comingSoon({
        title: "Estruturas",
        href: "/coming-soon/structures",
        icon: LayoutGrid,
        order: 40,
      }),
    ],
  },
  {
    key: "sidebar-placeholders:operacoes",
    groupLabel: NAV_GROUPS.OPERACOES,
    navItems: [
      comingSoon({
        title: "Presenças",
        href: "/coming-soon/attendance",
        icon: Users,
        order: 20,
      }),
      comingSoon({
        title: "Ocorrências",
        href: "/coming-soon/incidents",
        icon: AlertTriangle,
        order: 30,
      }),
      comingSoon({
        title: "Atendimentos",
        href: "/coming-soon/appointments",
        icon: HeartHandshake,
        order: 40,
      }),
      comingSoon({
        title: "Encaminhamentos",
        href: "/coming-soon/referrals",
        icon: Handshake,
        order: 50,
      }),
    ],
  },
  {
    key: "sidebar-placeholders:institucional",
    groupLabel: NAV_GROUPS.INSTITUCIONAL,
    navItems: [
      comingSoon({
        title: "Funcionários",
        href: "/coming-soon/staff",
        icon: Users,
        order: 10,
      }),
      comingSoon({
        title: "Voluntários",
        href: "/coming-soon/volunteers",
        icon: HeartHandshake,
        order: 20,
      }),
      comingSoon({
        title: "Parceiros",
        href: "/coming-soon/partners",
        icon: Handshake,
        order: 30,
      }),
    ],
  },
  {
    key: "sidebar-placeholders:financeiro",
    groupLabel: NAV_GROUPS.FINANCEIRO,
    navItems: [
      comingSoon({
        title: "Receitas",
        href: "/coming-soon/income",
        icon: PiggyBank,
        order: 10,
      }),
      comingSoon({
        title: "Despesas",
        href: "/coming-soon/expenses",
        icon: Receipt,
        order: 20,
      }),
      comingSoon({
        title: "Orçamentos",
        href: "/coming-soon/budgets",
        icon: Wallet,
        order: 30,
      }),
      comingSoon({
        title: "Prestação de Contas",
        href: "/coming-soon/accountability",
        icon: FileText,
        order: 40,
      }),
    ],
  },
  {
    key: "sidebar-placeholders:recursos",
    groupLabel: NAV_GROUPS.RECURSOS,
    navItems: [
      comingSoon({
        title: "Estoque",
        href: "/coming-soon/stock",
        icon: Boxes,
        order: 20,
      }),
    ],
  },
  {
    key: "sidebar-placeholders:educacao",
    groupLabel: NAV_GROUPS.EDUCACAO,
    navItems: [
      comingSoon({
        title: "Cursos",
        href: "/coming-soon/courses",
        icon: GraduationCap,
        order: 10,
      }),
    ],
  },
  {
    key: "sidebar-placeholders:relatorios",
    groupLabel: NAV_GROUPS.RELATORIOS,
    navItems: [
      comingSoon({
        title: "Pessoas",
        href: "/coming-soon/reports-people",
        icon: FileBarChart,
        order: 10,
      }),
      comingSoon({
        title: "Famílias",
        href: "/coming-soon/reports-families",
        icon: FileBarChart,
        order: 20,
      }),
      comingSoon({
        title: "Ações",
        href: "/coming-soon/reports-actions",
        icon: FileBarChart,
        order: 30,
      }),
      comingSoon({
        title: "Presenças",
        href: "/coming-soon/reports-attendance",
        icon: FileBarChart,
        order: 40,
      }),
      comingSoon({
        title: "Atendimentos",
        href: "/coming-soon/reports-appointments",
        icon: FileBarChart,
        order: 50,
      }),
      comingSoon({
        title: "Encaminhamentos",
        href: "/coming-soon/reports-referrals",
        icon: FileBarChart,
        order: 60,
      }),
      comingSoon({
        title: "Financeiro",
        href: "/coming-soon/reports-finance",
        icon: FileBarChart,
        order: 70,
      }),
      comingSoon({
        title: "Declarações",
        href: "/coming-soon/reports-declarations",
        icon: FileBarChart,
        order: 80,
      }),
    ],
  },
  {
    key: "sidebar-placeholders:portais",
    groupLabel: NAV_GROUPS.PORTAIS,
    navItems: [
      comingSoon({
        title: "Portal Familiar",
        href: "/coming-soon/portal-family",
        icon: Users,
        order: 10,
      }),
      comingSoon({
        title: "Portal Parceiros",
        href: "/coming-soon/portal-partners",
        icon: Handshake,
        order: 20,
      }),
    ],
  },
  {
    key: "sidebar-placeholders:assinatura",
    groupLabel: NAV_GROUPS.ASSINATURA,
    navItems: [
      comingSoon({
        title: "Plano",
        href: "/coming-soon/subscription-plan",
        icon: FileText,
        order: 10,
      }),
      comingSoon({
        title: "Pagamentos",
        href: "/coming-soon/subscription-payments",
        icon: Receipt,
        order: 20,
      }),
      comingSoon({
        title: "Suporte",
        href: "/coming-soon/subscription-support",
        icon: LifeBuoy,
        order: 30,
      }),
    ],
  },
];
