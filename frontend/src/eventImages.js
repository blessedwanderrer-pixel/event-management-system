/** Map demo event titles to unique cover images (no DB image column). */
const EVENT_IMAGES = {
  'AI & Automation Summit 2026': '/images/events/ai-automation-summit.png',
  'Nowshera Tech Meetup': '/images/events/nowshera-tech-meetup.png',
  'Future Founders Business Conference': '/images/events/future-founders-conference.png',
  'Creative Minds Design Workshop': '/images/events/creative-minds-workshop.png',
  'Digital Marketing Masterclass': '/images/events/digital-marketing-masterclass.png',
  'Pakistan Future Tech Expo 2026': '/images/events/pakistan-future-tech-expo.png',
};

export function eventCoverImage(event) {
  const title = String(event?.title || '').trim();
  if (EVENT_IMAGES[title]) return EVENT_IMAGES[title];
  const lower = title.toLowerCase();
  if (lower.includes('tech')) return '/images/event-table.jpg';
  return '/images/event-gathering.jpg';
}
