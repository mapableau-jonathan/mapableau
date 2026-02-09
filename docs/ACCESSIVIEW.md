# AccessiView

AccessiView is a 3D interactive walk through feature: users can preview venue accessibility before they go. The dedicated page is available at `/accessiview`.

## Page contents

- **Headline and description**: Defines AccessiView (3D venue accessibility view, preview before you go).
- **Video block**: Embeds a configurable video (YouTube, Vimeo, or direct .mp4). When no URL is set, a “Video coming soon” placeholder is shown.
- **CTAs**: “Find a provider” (links to Provider Finder) and “Back to home”.

## Setting the video URL

Set the optional environment variable:

```bash
NEXT_PUBLIC_ACCESSIVIEW_VIDEO_URL=<url>
```

Supported values:

- **YouTube**: `https://www.youtube.com/watch?v=VIDEO_ID` or `https://youtu.be/VIDEO_ID`
- **Vimeo**: `https://vimeo.com/VIDEO_ID`
- **Direct video**: URL to an `.mp4`, `.webm`, or `.ogg` file

The page normalizes YouTube and Vimeo URLs to their embed forms and uses an iframe. Direct video URLs use the HTML5 `<video>` element. If the variable is unset or empty, the placeholder is shown.

## Config and copy

Copy and URL are centralised in [lib/accessiview.ts](../lib/accessiview.ts):

- `ACCESSIVIEW_TITLE`
- `ACCESSIVIEW_DESCRIPTION`
- `ACCESSIVIEW_VIDEO_CAPTIONS_NOTE`
- `getAccessiviewVideoUrl()` (reads env)
- `parseVideoUrl()` (normalises URL for iframe or video tag)

Change these to update the page without editing the page component.

## Entry points

- **Home**: “How it works” section includes a link: “See the AccessiView 3D walk through”.
- **Provider Finder**: Footer “Need help?” includes “Step-by-step guides” and “AccessiView” (both link to `/accessiview`).

## Accessibility

- One H1, landmark roles, and a screen-reader-only H2 for the video section.
- Video does not autoplay with sound; captions note is in the copy.
- Focus states and link styling follow the rest of the app.
