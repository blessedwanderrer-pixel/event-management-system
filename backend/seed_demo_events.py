"""Seed 6 published demo events using existing events table columns only."""
from datetime import date, time
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

EVENTS = [
    {
        "title": "AI & Automation Summit 2026",
        "description": (
            "Join industry professionals, developers, entrepreneurs, and technology enthusiasts "
            "for a full-day summit focused on Artificial Intelligence and business automation. "
            "Explore how AI agents, intelligent workflows, and automation are transforming modern "
            "businesses. The event includes expert talks, practical demonstrations, networking "
            "sessions, and discussions about the future of AI.\n\n"
            "Category: Technology\n\n"
            "Highlights:\n"
            "- AI automation demonstrations\n"
            "- Agentic AI discussions\n"
            "- Business automation strategies\n"
            "- Networking with technology professionals\n"
            "- Live AI workflow demonstrations\n\n"
            "Schedule: 10:00 AM – 4:00 PM"
        ),
        "event_date": date(2026, 9, 25),
        "event_time": time(10, 0),
        "location": "Nowshera Convention Center, Nowshera",
        "capacity": 150,
        "status": "published",
    },
    {
        "title": "Nowshera Tech Meetup",
        "description": (
            "A relaxed technology meetup bringing together developers, students, founders, "
            "designers, and technology enthusiasts from the local community. Share ideas, "
            "discover new technologies, discuss current projects, and connect with people "
            "working on exciting digital products.\n\n"
            "Category: Technology & Networking\n\n"
            "Highlights:\n"
            "- Developer networking\n"
            "- Project showcases\n"
            "- Startup discussions\n"
            "- Technology talks\n"
            "- Community networking\n\n"
            "Schedule: 2:00 PM – 6:00 PM"
        ),
        "event_date": date(2026, 10, 3),
        "event_time": time(14, 0),
        "location": "Innovation Hub, Nowshera",
        "capacity": 100,
        "status": "published",
    },
    {
        "title": "Future Founders Business Conference",
        "description": (
            "An inspiring business conference designed for entrepreneurs, startup founders, "
            "freelancers, and aspiring business leaders. Learn practical strategies for building "
            "businesses, finding customers, using technology effectively, and turning ideas into "
            "sustainable ventures.\n\n"
            "Category: Business\n\n"
            "Highlights:\n"
            "- Entrepreneurship sessions\n"
            "- Startup growth strategies\n"
            "- Marketing discussions\n"
            "- Founder networking\n"
            "- Business idea sessions\n\n"
            "Schedule: 11:00 AM – 5:00 PM"
        ),
        "event_date": date(2026, 10, 10),
        "event_time": time(11, 0),
        "location": "Grand Pearl Hall, Nowshera",
        "capacity": 200,
        "status": "published",
    },
    {
        "title": "Creative Minds Design Workshop",
        "description": (
            "A hands-on creative workshop for designers, students, content creators, and anyone "
            "interested in modern digital design. Learn about visual communication, design systems, "
            "branding, user experience, and creating professional digital experiences.\n\n"
            "Category: Design\n\n"
            "Highlights:\n"
            "- UI/UX design\n"
            "- Branding fundamentals\n"
            "- Design systems\n"
            "- Creative exercises\n"
            "- Portfolio improvement tips\n\n"
            "Schedule: 1:00 PM – 5:00 PM"
        ),
        "event_date": date(2026, 10, 18),
        "event_time": time(13, 0),
        "location": "Creative Studio, Nowshera",
        "capacity": 60,
        "status": "published",
    },
    {
        "title": "Digital Marketing Masterclass",
        "description": (
            "Learn how modern businesses attract customers and build their online presence through "
            "digital marketing. This practical masterclass covers social media strategy, content "
            "marketing, search optimization, lead generation, analytics, and using AI tools to "
            "improve marketing productivity.\n\n"
            "Category: Marketing\n\n"
            "Highlights:\n"
            "- Social media marketing\n"
            "- Content strategy\n"
            "- Lead generation\n"
            "- SEO fundamentals\n"
            "- AI-powered marketing\n"
            "- Marketing analytics\n\n"
            "Schedule: 10:00 AM – 3:00 PM"
        ),
        "event_date": date(2026, 10, 25),
        "event_time": time(10, 0),
        "location": "Nowshera Business Center",
        "capacity": 120,
        "status": "published",
    },
    {
        "title": "Pakistan Future Tech Expo 2026",
        "description": (
            "Experience a full day of emerging technology, innovation, startups, and digital "
            "products at one of the region's biggest technology-focused events. Discover new ideas, "
            "meet technology companies, explore innovative products, and participate in discussions "
            "about the future of technology in Pakistan.\n\n"
            "Category: Technology & Innovation\n\n"
            "Highlights:\n"
            "- Technology exhibitions\n"
            "- Startup showcases\n"
            "- AI demonstrations\n"
            "- Innovation talks\n"
            "- Networking opportunities\n"
            "- Future technology discussions\n\n"
            "Schedule: 10:00 AM – 7:00 PM"
        ),
        "event_date": date(2026, 11, 7),
        "event_time": time(10, 0),
        "location": "Nowshera Expo Arena",
        "capacity": 500,
        "status": "published",
    },
]


def main():
    engine = create_engine(
        os.environ["DATABASE_URL"].replace("postgresql://", "postgresql+psycopg://", 1),
        pool_pre_ping=True,
    )
    with engine.begin() as conn:
        created = []
        updated = []
        for event in EVENTS:
            existing = conn.execute(
                text("SELECT id FROM events WHERE title = :title LIMIT 1"),
                {"title": event["title"]},
            ).mappings().first()
            if existing:
                row = conn.execute(
                    text(
                        """
                        UPDATE events
                        SET description = :description,
                            event_date = :event_date,
                            event_time = :event_time,
                            location = :location,
                            capacity = :capacity,
                            status = :status,
                            updated_at = now()
                        WHERE id = :id
                        RETURNING id, title, event_date, event_time, location, capacity, status
                        """
                    ),
                    {**event, "id": existing["id"]},
                ).mappings().one()
                updated.append(dict(row))
                continue
            row = conn.execute(
                text(
                    """
                    INSERT INTO events (title, description, event_date, event_time, location, capacity, status)
                    VALUES (:title, :description, :event_date, :event_time, :location, :capacity, :status)
                    RETURNING id, title, event_date, event_time, location, capacity, status
                    """
                ),
                event,
            ).mappings().one()
            created.append(dict(row))

    print(f"CREATED {len(created)}")
    for row in created:
        print("CREATED\t{id}\t{title}\t{event_date}\t{event_time}\t{capacity}\t{status}".format(**row))
    print(f"UPDATED {len(updated)}")
    for row in updated:
        print("UPDATED\t{id}\t{title}\t{event_date}\t{event_time}\t{capacity}\t{status}".format(**row))


if __name__ == "__main__":
    main()
