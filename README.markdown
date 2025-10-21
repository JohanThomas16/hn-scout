# HN Scout

## Overview
HN Scout is a web application designed to explore and curate content from Hacker News (HN) using the Algolia API. It provides a user-friendly interface to filter posts by domain and time, save favorite posts, and view detailed item pages with comments.

## UI/UX Choices
- **Dark Theme**: A dark background (bg-gray-900) with contrasting text colors (white, green-400) reduces eye strain, aligning with the late-night coding culture often associated with HN users.
- **Card Layout**: A grid layout (grid-cols-1 to grid-cols-3) for posts ensures a clean, responsive design that adapts to different screen sizes, enhancing readability and navigation.
- **Infinite Scroll**: Implemented with IntersectionObserver for seamless loading of additional content, improving user experience by avoiding manual pagination.
- **Sidebar Toggle**: A fixed sidebar for saved posts with a 📌 button toggle provides quick access without cluttering the main view, using smooth transitions for a polished feel.
- **Score Gauge**: A circular SVG gauge visually represents post scores, making it intuitive to compare engagement at a glance.
- **Suggestion Dropdown**: Autocomplete suggestions below the domain filter input offer real-time feedback, improving usability for domain filtering.

## Algorithm Choices
- **Scoring Formula**: The engagement score is calculated as `(points + 0.5 * num_comments + 1) / Math.pow(ageHours + 1, 1.2)`. This formula:
  - Weights points and comments (with comments at half value) to balance raw popularity with discussion activity.
  - Adds 1 to avoid division by zero for new posts.
  - Uses a 1.2 exponent on age (in hours) to penalize older posts more aggressively, ensuring recent, engaging content rises to the top.
- **Time Filter**: A numeric filter (`created_at_i > current_time - 86400 * timeFilter`) restricts posts to a user-defined time range (1-30 days), optimized for relevance.
- **Comment Flattening**: The `flattenComments` function recursively processes nested comment trees, sorting by `created_at` to show the latest 5 comments, ensuring users see the most recent discussions.

## Packages Used
- **Next.js**: Chosen for server-side rendering (SSR) and static site generation (SSG), providing performance benefits and easy routing. The `getServerSideProps` function leverages SSR for SEO and initial load speed.
- **React**: Core library for building the dynamic UI, with hooks (`useState`, `useEffect`, `useRef`) for state management and side effects.
- **Algolia API**: Used via `fetch` to access HN data, selected for its robust, real-time search capabilities and structured response format.

## Contributions Outside Assigned Task
- **Save Functionality**: Added localStorage-based saving of posts, enhancing user personalization with a toggleable sidebar.
- **Score Visualization**: Introduced the `ScoreGauge` SVG component for a unique, engaging way to display post scores.
- **Error Handling**: Implemented comprehensive error states with retry options and fallback UI, improving robustness.
- **Responsive Design**: Ensured the layout works across devices with Tailwind CSS classes, adding polish beyond basic functionality.
- **Comment Display**: Extended the item page to include the latest 5 comments, providing deeper context.

## AI Tools Used
- **Grok (xAI)**: Utilized for debugging UI/UX issues (e.g., suggestion dropdown persistence), optimizing algorithms (e.g., scoring formula refinement).
- **Cursor: Leveraged for  real-time error detection, streamlining the coding process and reducing manual debugging time.
