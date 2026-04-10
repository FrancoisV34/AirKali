import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

interface GeoApiCommune {
  code: string;
  nom: string;
  codesPostaux: string[];
  centre?: {
    type: string;
    coordinates: [number, number];
  };
  population?: number;
}

async function main() {
  console.log('Chargement des communes depuis geo.api.gouv.fr...');

  const response = await fetch(
    'https://geo.api.gouv.fr/communes?fields=nom,code,codesPostaux,centre,population&format=json',
  );

  if (!response.ok) {
    throw new Error(`Erreur API: ${response.status}`);
  }

  const communes: GeoApiCommune[] = await response.json();
  console.log(`${communes.length} communes récupérées`);

  let inserted = 0;
  let skipped = 0;
  const batchSize = 500;

  for (let i = 0; i < communes.length; i += batchSize) {
    const batch = communes.slice(i, i + batchSize);
    const validCommunes = batch.filter(
      (c) => c.centre && c.codesPostaux && c.codesPostaux.length > 0,
    );

    skipped += batch.length - validCommunes.length;

    const operations = validCommunes.map((c) =>
      prisma.commune.upsert({
        where: { codeInsee: c.code },
        create: {
          nom: c.nom,
          codePostal: c.codesPostaux[0],
          codeInsee: c.code,
          population: c.population ?? null,
          latitude: c.centre!.coordinates[1],
          longitude: c.centre!.coordinates[0],
          active: false,
        },
        update: {
          nom: c.nom,
          codePostal: c.codesPostaux[0],
          population: c.population ?? null,
          latitude: c.centre!.coordinates[1],
          longitude: c.centre!.coordinates[0],
        },
      }),
    );

    await prisma.$transaction(operations);
    inserted += validCommunes.length;

    if ((i / batchSize) % 10 === 0) {
      console.log(`  ${inserted} communes insérées...`);
    }
  }

  console.log(
    `Seed terminé: ${inserted} communes insérées, ${skipped} ignorées (sans coordonnées)`,
  );
}

main()
  .catch((e) => {
    console.error('Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
