import { describe, it, expect } from 'vitest';
import {
  guardTransition,
  articleSchema,
  publicArticleIndexSelect,
  publicArticleSelect,
} from '../src/editorial.js';
import type { AuthenticatedUser } from '../src/identity.js';

const editor: AuthenticatedUser = {
  id: 'editor',
  email: 'editor@example.test',
  displayName: 'Editor',
  status: 'ACTIVE',
  roles: ['EDITOR'],
  permissions: ['articles:review'],
};
const ready = {
  status: 'FACT_CHECK',
  authorId: 'reporter',
  sources: [{ verified: true }],
  claims: [{ status: 'VERIFIED' }],
};
describe('editorial governance', () => {
  it('does not expose editorial evidence or private identities publicly', () => {
    for (const field of ['claims', 'sources', 'revisions', 'approvedBy', 'authorId', 'version'])
      expect(publicArticleSelect).not.toHaveProperty(field);
    expect(publicArticleSelect.author.select).toEqual({ displayName: true });
    expect(publicArticleIndexSelect).toEqual({
      slug: true,
      title: true,
      category: true,
      location: true,
      publishedAt: true,
      updatedAt: true,
    });
  });
  it('rechecks verification and independent approval before scheduling or publication', () => {
    for (const target of ['SCHEDULED', 'PUBLISHED']) {
      expect(() => guardTransition({ ...ready, status: 'APPROVED' }, target, editor)).toThrow(
        'Independent approval',
      );
      expect(() =>
        guardTransition(
          { ...ready, status: 'APPROVED', approvedBy: editor.id, approvedAt: new Date() },
          target,
          editor,
        ),
      ).not.toThrow();
      expect(() =>
        guardTransition(
          {
            ...ready,
            status: 'APPROVED',
            approvedBy: editor.id,
            approvedAt: new Date(),
            image: { rightsStatus: 'PENDING' },
          },
          target,
          editor,
        ),
      ).toThrow('Independent approval');
    }
  });
  it('requires independent approval even for super administrators', () => {
    expect(() =>
      guardTransition(ready, 'APPROVED', { ...editor, id: 'reporter', permissions: ['*'] }),
    ).toThrow('different editor');
  });
  it('rejects an unverified claim and missing sources', () => {
    expect(() =>
      guardTransition({ ...ready, claims: [{ status: 'UNVERIFIED' }] }, 'APPROVED', editor),
    ).toThrow('Verify');
    expect(() => guardTransition({ ...ready, sources: [] }, 'APPROVED', editor)).toThrow('Verify');
  });
  it('allows independently verified approval', () =>
    expect(() => guardTransition(ready, 'APPROVED', editor)).not.toThrow());
  it('blocks draft-to-publication and unprivileged reviewers', () => {
    expect(() => guardTransition({ ...ready, status: 'DRAFT' }, 'PUBLISHED', editor)).toThrow(
      'transition',
    );
    expect(() => guardTransition(ready, 'APPROVED', { ...editor, permissions: [] })).toThrow(
      'permission',
    );
  });
  it('rejects injected status and unsafe source URL schemes', () => {
    const draft = {
      title: 'தமிழ் செய்தி',
      slug: 'tamil-news',
      summary: 'A verified article summary',
      body: 'An article body that has sufficient length.',
      category: 'local',
      location: 'chennai',
    };
    expect(articleSchema.safeParse({ ...draft, status: 'PUBLISHED' }).success).toBe(false);
    expect(
      articleSchema.safeParse({ ...draft, sources: [{ label: 'bad', url: 'javascript:alert(1)' }] })
        .success,
    ).toBe(false);
    expect(articleSchema.safeParse(draft).success).toBe(true);
  });
});
