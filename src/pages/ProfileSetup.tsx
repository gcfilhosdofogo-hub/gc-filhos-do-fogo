"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { useSession } from "../components/SessionContextProvider";
import { User, UserRole, ALL_BELTS } from "../../types";
import { Button } from "../../components/Button";
import {
  ArrowLeft,
  Save,
  AlertCircle,
} from "lucide-react";
import { Logo } from "../../components/Logo";

interface ProfileSetupProps {
  onProfileComplete: (user: User) => void;
  onBack: () => void;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({
  onProfileComplete,
  onBack,
}) => {
  const { session, userId, isLoading: sessionLoading } = useSession(); // userId agora vem do useSession

  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [availableProfessors, setAvailableProfessors] = useState<User[]>([]);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    nickname: "",
    birth_date: "",
    phone: "",
    belt: ALL_BELTS[0],
    role: "aluno" as UserRole,
    professor_name: "",
    graduation_cost: undefined as number | undefined,
  });

  useEffect(() => {
    if (sessionLoading || !userId) { // Usa userId diretamente
        setLoading(true); // Mantém o estado de carregamento enquanto userId não está disponível
        return;
    }

    const fetchProfileAndProfessors = async () => {
      setLoading(true);

      /** 🔹 BUSCA PERFIL (SEM ERRO FALSO) */
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select(
          `
          first_name,
          last_name,
          nickname,
          birth_date,
          phone,
          belt,
          role,
          professor_name,
          graduation_cost
        `
        )
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        setIsNewUser(false);
      } else if (profileData) {
        /** 👤 USUÁRIO EXISTENTE */
        setFormData({
          first_name: profileData.first_name || "",
          last_name: profileData.last_name || "",
          nickname: profileData.nickname || "",
          birth_date: profileData.birth_date || "",
          phone: profileData.phone || "",
          belt: profileData.belt || ALL_BELTS[0],
          role: (profileData.role as UserRole) || "aluno",
          professor_name: profileData.professor_name || "",
          graduation_cost:
            profileData.graduation_cost !== null
              ? Number(profileData.graduation_cost)
              : undefined,
        });
        setIsNewUser(false);
      } else {
        /** 🆕 NOVO USUÁRIO */
        setIsNewUser(true);

        const emailNamePart = session?.user.email?.split("@")[0] ?? "";
        setFormData((prev) => ({
          ...prev,
          first_name: emailNamePart,
        }));
      }

      /** 🔹 BUSCA PROFESSORES */
      const { data: profsData, error: profsError } = await supabase
        .from("professor_admin_profiles")
        .select("id, first_name, last_name, nickname, role");

      if (!profsError && profsData) {
        setAvailableProfessors(
          profsData.map((p) => ({
            id: p.id,
            name:
              `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() ||
              p.nickname ||
              "Usuário",
            nickname: p.nickname ?? undefined,
            email: "",
            role: p.role as UserRole,
            first_name: p.first_name ?? undefined,
            last_name: p.last_name ?? undefined,
          }))
        );
      }

      setLoading(false);
    };

    fetchProfileAndProfessors();
  }, [userId, sessionLoading, session]); // Dependências atualizadas

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !userId) return; // Garante que userId esteja disponível

    setLoading(true);

    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        first_name: formData.first_name,
        last_name: formData.last_name,
        nickname: formData.nickname,
        birth_date: formData.birth_date || null,
        phone: formData.phone || null,
        belt: formData.belt,
        role: formData.role,
        professor_name: formData.professor_name || null,
        graduation_cost:
          formData.graduation_cost !== undefined
            ? formData.graduation_cost
            : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      alert("Erro ao salvar perfil: " + error.message);
      setLoading(false);
      return;
    }

    onProfileComplete({
      id: userId!,
      name: `${formData.first_name} ${formData.last_name}`.trim(),
      nickname: formData.nickname || undefined,
      email: session.user.email || "",
      role: formData.role,
      belt: formData.belt,
      phone: formData.phone || undefined,
      professorName: formData.professor_name || undefined,
      birthDate: formData.birth_date || undefined,
      first_name: formData.first_name,
      last_name: formData.last_name,
      graduationCost: formData.graduation_cost,
    });

    setLoading(false);
  };

  if (loading || sessionLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-white">Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-900 p-4">
      <div className="w-full max-w-md bg-stone-800 rounded-2xl border border-stone-700">
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 text-center relative">
          <button
            onClick={onBack}
            className="absolute left-4 top-4 text-white"
          >
            <ArrowLeft />
          </button>

          <Logo className="h-20 w-20 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white">
            {isNewUser ? "Complete seu Perfil" : "Editar Perfil"}
          </h2>
          <p className="text-white/80 text-sm">
            {isNewUser
              ? "Preencha seus dados para começar"
              : "Atualize suas informações"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isNewUser && (
            <div className="bg-yellow-900/20 border border-yellow-800 text-yellow-400 p-3 rounded flex gap-2 text-sm">
              <AlertCircle size={18} />
              Complete seu cadastro para continuar.
            </div>
          )}

          <input
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            placeholder="Nome"
            className="w-full p-2 rounded bg-stone-900 text-white"
            required
          />

          <input
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            placeholder="Sobrenome"
            className="w-full p-2 rounded bg-stone-900 text-white"
          />

          <Button type="submit" fullWidth disabled={loading}>
            <Save size={16} /> Salvar
          </Button>
        </form>
      </div>
    </div>
  );
};