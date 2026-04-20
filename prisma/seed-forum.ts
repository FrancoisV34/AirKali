import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding forum data...');

  // --- Categories ---
  const categories = await Promise.all([
    prisma.category.upsert({ where: { name: 'Qualité de l\'air' }, update: {}, create: { name: 'Qualité de l\'air' } }),
    prisma.category.upsert({ where: { name: 'Météo' }, update: {}, create: { name: 'Météo' } }),
    prisma.category.upsert({ where: { name: 'Santé & Environnement' }, update: {}, create: { name: 'Santé & Environnement' } }),
    prisma.category.upsert({ where: { name: 'Suggestions' }, update: {}, create: { name: 'Suggestions' } }),
  ]);
  console.log(`✓ ${categories.length} catégories`);

  // --- Users ---
  const hash = await bcrypt.hash('Password123!', 10);
  const usersData = [
    { email: 'alice@example.com', username: 'Alice', nom: 'Dupont', prenom: 'Alice' },
    { email: 'bob@example.com', username: 'Bob', nom: 'Martin', prenom: 'Bob' },
    { email: 'claire@example.com', username: 'Claire', nom: 'Bernard', prenom: 'Claire' },
    { email: 'david@example.com', username: 'David', nom: 'Leroy', prenom: 'David' },
    { email: 'emma@example.com', username: 'Emma', nom: 'Petit', prenom: 'Emma' },
  ];

  const users = await Promise.all(
    usersData.map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { ...u, password: hash },
      }),
    ),
  );
  console.log(`✓ ${users.length} utilisateurs (mot de passe : Password123!)`);

  // --- Topics ---
  const topicsData = [
    {
      title: 'Indice de qualité de l\'air à Paris — vos observations ?',
      content: `Bonjour à tous,\n\nJ'habite dans le 11e arrondissement et depuis quelques semaines, l'indice AQI affiché sur l'application semble systématiquement plus élevé que ce que je ressens réellement. Est-ce que d'autres utilisateurs ont remarqué un décalage similaire ?\n\nMerci pour vos retours !`,
      userId: users[0].id,
      categoryId: categories[0].id,
    },
    {
      title: 'Alerte PM2.5 dans le Nord — comment se protéger ?',
      content: `Les données de ces derniers jours montrent des pics de PM2.5 importants dans la région Nord-Pas-de-Calais. Quels sont vos conseils pratiques pour limiter l'exposition ?\n\n- Porter un masque FFP2 en extérieur ?\n- Eviter le sport intensif ?\n- Purificateur d'air en intérieur ?\n\nPartagez vos expériences !`,
      userId: users[1].id,
      categoryId: categories[0].id,
    },
    {
      title: 'Vague de chaleur prévue — données météo fiables ?',
      content: `Avec la vague de chaleur annoncée pour la semaine prochaine, je me demande à quel point les données météo de l'application sont fiables pour anticiper les pics de température.\n\nJ'ai comparé avec Météo France et il y a parfois 2-3°C d'écart. Normal ?`,
      userId: users[2].id,
      categoryId: categories[1].id,
    },
    {
      title: 'Lien entre pollution et maladies respiratoires : vos témoignages',
      content: `Je souffre d'asthme depuis l'enfance et j'ai commencé à corréler mes crises avec les données de l'application. Les résultats sont frappants : 80% de mes crises surviennent quand l'indice dépasse 70.\n\nEst-ce que d'autres personnes ont fait des observations similaires ?`,
      userId: users[3].id,
      categoryId: categories[2].id,
    },
    {
      title: 'Suggestion : ajouter une alerte SMS quand l\'AQI dépasse un seuil',
      content: `Serait-il possible d'ajouter une fonctionnalité d'alerte par SMS (ou notification push) lorsque l'indice de qualité de l'air dépasse un seuil personnalisable ?\n\nCe serait très utile pour les personnes vulnérables qui n'ont pas forcément le réflexe d'ouvrir l'application chaque matin.`,
      userId: users[4].id,
      categoryId: categories[3].id,
    },
  ];

  const topics = await Promise.all(
    topicsData.map((t) => prisma.topic.create({ data: t })),
  );
  console.log(`✓ ${topics.length} topics`);

  // --- Comments ---
  const commentsData = [
    // Topic 0
    { content: 'Même observation ici dans le 20e ! Je pense que les capteurs de mesure ont du mal avec la chaleur en ce moment.', userId: users[1].id, topicId: topics[0].id },
    { content: 'Il faut savoir que l\'indice AQI est une moyenne sur 24h, donc il peut ne pas refléter ce que vous ressentez à un instant T.', userId: users[2].id, topicId: topics[0].id },
    { content: 'Merci pour la précision ! Je ne savais pas que c\'était une moyenne sur 24h, ça explique tout.', userId: users[0].id, topicId: topics[0].id, parentId: null },

    // Topic 1
    { content: 'Le masque FFP2 est clairement la meilleure option pour les sorties courtes. Pour les enfants, rester à l\'intérieur avec un purificateur est préférable.', userId: users[0].id, topicId: topics[1].id },
    { content: 'J\'utilise un purificateur HEPA depuis 2 ans et la différence est notable. Environ 200€ pour un bon modèle, ça vaut largement l\'investissement.', userId: users[3].id, topicId: topics[1].id },
    { content: 'Vous pouvez aussi surveiller l\'heure des pics — en général entre 7h-9h et 17h-20h en semaine à cause du trafic.', userId: users[4].id, topicId: topics[1].id },

    // Topic 2
    { content: 'L\'écart vient souvent de la localisation du capteur météo de référence. Si vous êtes en ville dense, l\'îlot de chaleur urbain peut faire 2-3°C de plus.', userId: users[1].id, topicId: topics[2].id },
    { content: 'Pour les vagues de chaleur, les données à J+3 sont généralement fiables à ±1°C. Au-delà c\'est plus incertain.', userId: users[4].id, topicId: topics[2].id },

    // Topic 3
    { content: 'Vos données sont très précieuses ! Avez-vous pensé à les partager avec des chercheurs ? Des études épidémiologiques manquent cruellement de données terrain comme ça.', userId: users[2].id, topicId: topics[3].id },
    { content: 'Pareil pour moi, rhinite allergique + pollution = combo catastrophique. Je commence à documenter aussi.', userId: users[0].id, topicId: topics[3].id },
    { content: 'Il existe des applications dédiées au suivi santé + pollution (AirVisual par exemple). Mais votre approche manuelle est intéressante car plus personnalisée.', userId: users[1].id, topicId: topics[3].id },

    // Topic 4
    { content: 'Excellente idée ! Une notification push sur mobile serait parfaite. SMS c\'est un peu dépassé, non ?', userId: users[0].id, topicId: topics[4].id },
    { content: 'Je soutiens cette suggestion. Pour les personnes âgées ou peu technophiles, le SMS reste plus accessible que les notifications d\'app.', userId: users[3].id, topicId: topics[4].id },
    { content: 'Idéalement les deux ! Notification push par défaut, SMS en option pour ceux qui le souhaitent.', userId: users[2].id, topicId: topics[4].id },
  ];

  const comments = await Promise.all(
    commentsData.map((c) => prisma.comment.create({ data: c })),
  );
  console.log(`✓ ${comments.length} commentaires`);

  // --- Votes ---
  const votesData = [
    // Votes topics
    { userId: users[1].id, targetType: 'TOPIC', targetId: topics[0].id, value: 1 },
    { userId: users[2].id, targetType: 'TOPIC', targetId: topics[0].id, value: 1 },
    { userId: users[3].id, targetType: 'TOPIC', targetId: topics[1].id, value: 1 },
    { userId: users[4].id, targetType: 'TOPIC', targetId: topics[1].id, value: 1 },
    { userId: users[0].id, targetType: 'TOPIC', targetId: topics[1].id, value: 1 },
    { userId: users[0].id, targetType: 'TOPIC', targetId: topics[3].id, value: 1 },
    { userId: users[1].id, targetType: 'TOPIC', targetId: topics[3].id, value: 1 },
    { userId: users[2].id, targetType: 'TOPIC', targetId: topics[4].id, value: 1 },
    { userId: users[3].id, targetType: 'TOPIC', targetId: topics[4].id, value: 1 },
    { userId: users[0].id, targetType: 'TOPIC', targetId: topics[2].id, value: -1 },
    // Votes commentaires
    { userId: users[0].id, targetType: 'COMMENT', targetId: comments[1].id, value: 1 },
    { userId: users[3].id, targetType: 'COMMENT', targetId: comments[1].id, value: 1 },
    { userId: users[2].id, targetType: 'COMMENT', targetId: comments[3].id, value: 1 },
    { userId: users[4].id, targetType: 'COMMENT', targetId: comments[4].id, value: 1 },
    { userId: users[0].id, targetType: 'COMMENT', targetId: comments[4].id, value: 1 },
    { userId: users[1].id, targetType: 'COMMENT', targetId: comments[8].id, value: 1 },
    { userId: users[4].id, targetType: 'COMMENT', targetId: comments[11].id, value: 1 },
    { userId: users[1].id, targetType: 'COMMENT', targetId: comments[12].id, value: 1 },
  ];

  await Promise.all(
    votesData.map((v) =>
      prisma.vote.upsert({
        where: { userId_targetType_targetId: { userId: v.userId, targetType: v.targetType, targetId: v.targetId } },
        update: { value: v.value },
        create: v,
      }),
    ),
  );
  console.log(`✓ ${votesData.length} votes`);

  console.log('\nSeed forum terminé !');
  console.log('Comptes créés (mot de passe : Password123!) :');
  usersData.forEach((u) => console.log(`  - ${u.email} (${u.username})`));
}

main()
  .catch((e) => {
    console.error('Erreur seed forum:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
