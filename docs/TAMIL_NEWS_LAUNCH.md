# Tamil newsroom launch scope

Confirmed by the owner on 2026-10-17; implementation is authorized. This is a scope record, not a production-readiness claim.

- Cover all Tamil Nadu. Aim for at least one reviewed story daily; missing evidence or approval holds publication.
- Website, Facebook (`https://www.facebook.com/magaram.in.5`) and YouTube (`https://www.youtube.com/@MagaramMedia-u6m`) are the launch destinations. The Facebook URL's Page/profile type and account ownership authorization remain unverified. The owner-supplied YouTube handle supersedes the earlier observed handle.
- Support both Shorts and longer videos with AI Tamil narration. Daily Shorts and two or three longer bulletins weekly are an initial recommendation, not a confirmed owner quota.
- AI budget: INR 1,000 per month, separate from existing AWS hosting. Proposed text/narration/reserve allocations are planning ceilings, not measured costs or a configured billing cap.
- ADMIN and SUPER_ADMIN alone may approve, publish immediately, schedule or publish corrections. Independent approval remains mandatory; an author cannot approve their own story. Editors retain preparation and verification workflows.
- Schedule input uses Asia/Kolkata (IST), stored as UTC. Recheck approval eligibility when publishing, including scheduled jobs. A legacy editor approval must return to review rather than publish.

## Delivery sequence

1. Complete permitted-feed operational acceptance on the existing AWS deployment: source registration, persisted fetch and worker restart evidence. No new production feed has been enabled in this change.
2. Produce source-bound Tamil drafts with claim references, model evaluation, pronunciation/name/date/number checks and metered generation. Provider absence remains unavailable.
3. Complete the admin preview package for the exact article, caption and finished videos. Editing approved assets must invalidate approval. Keep immediate and scheduled options.
4. Connect official Facebook Page publishing after identifying the Page and completing owner OAuth authorization.
5. Render template-based vertical and landscape videos using licensed visuals, Tamil narration and subtitles. Connect YouTube via owner OAuth authorization. Review finished videos before delivery.
6. Add durable per-channel delivery records, retry/deduplication, cancellation, correction handling and cost cutoffs. Publish the website before related social deliveries.
7. Run end-to-end acceptance, Tamil editorial review, restore rehearsal and production release checks.

No paid provider, plugin, social connection or generation budget has been activated by this scope confirmation.
