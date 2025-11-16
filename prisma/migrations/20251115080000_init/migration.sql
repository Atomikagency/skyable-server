-- CreateTable User
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateTable Block
CREATE TABLE "Block" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "documentation" TEXT NOT NULL,
    "usage" TEXT,
    "version" TEXT NOT NULL DEFAULT 'development',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- Contrainte pour s'assurer que version ne peut être que 'production', 'development', ou 'beta'
ALTER TABLE "Block"
ADD CONSTRAINT "Block_version_check"
CHECK ("version" IN ('production', 'development', 'beta'));

-- CreateTable Prompts
CREATE TABLE prompts (
    -- Clé primaire pour l'identification unique de chaque version
    id SERIAL PRIMARY KEY,

    -- Nom logique et unique du prompt (ex: 'summarizer', 'image_describer')
    name VARCHAR(100) NOT NULL,

    -- Le contenu du prompt (le texte de l'instruction)
    content TEXT NOT NULL,

    -- Tag de version pour un suivi humain (ex: 'v1.0', 'v1.1', 'draft-2')
    version_tag VARCHAR(20) NOT NULL,

    -- Indicateur de la version active/de production
    is_production BOOLEAN NOT NULL DEFAULT FALSE,

    -- Horodatage de la création de cette version
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Contrainte d'Unicité Composite
-- Assure qu'on ne peut pas avoir deux fois le même couple (name, version_tag)
ALTER TABLE prompts
ADD CONSTRAINT uc_prompt_version UNIQUE (name, version_tag);

-- Contrainte d'Unicité Partielle (CLÉ DU VERSIONNEMENT)
-- Assure qu'il n'y a qu'UNE SEULE ligne avec is_production = TRUE pour un 'name' donné.
-- C'est ce qui garantit qu'un seul prompt est actif.
CREATE UNIQUE INDEX idx_unique_production_prompt
ON prompts (name)
WHERE is_production = TRUE;

-- Index d'Accès Rapide
-- Optimise la requête de production qui sera la plus fréquente
CREATE INDEX idx_name_production_access
ON prompts (name, is_production)
WHERE is_production = TRUE;
