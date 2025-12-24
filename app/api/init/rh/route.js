import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req) {
  // 1️⃣ نشوفو واش كاين شي RH دابا
  const count = await prisma.utilisateurRH.count();

  if (count < 1) {
    return NextResponse.json(
      { error: "Initialisation déjà effectuée" },
      { status: 403 }
    );
  }

  // 2️⃣ نقرا body
  const { username, mot_de_passe, nom_complet } = await req.json();

  if (!username || !mot_de_passe || !nom_complet) {
    return NextResponse.json(
      { error: "Tous les champs sont obligatoires" },
      { status: 400 }
    );
  }

  // 3️⃣ نhashيو password
  const hash = await bcrypt.hash(mot_de_passe, 10);

  // 4️⃣ نخلق أول RH
  const user = await prisma.utilisateurRH.create({
    data: {
      username,
      mot_de_passe: hash,
      nom_complet,
    },
    select: {
      id: true,
      username: true,
      nom_complet: true,
      cree_le: true,
    },
  });

  return NextResponse.json({
    message: "✅ Premier utilisateur RH créé",
    user,
  });
}
