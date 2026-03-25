import {
  and,
  conversations,
  count,
  db,
  desc,
  eq,
  ilike,
  isNull,
  lt,
  messages,
  ne,
  or,
  users
} from "@mma/db";

import type { UserRole } from "@mma/shared";

interface ParticipantUserRow {
  email: string;
  id: string;
  image: string | null;
  isActive: boolean;
  name: string;
  role: string;
  studentProfile: {
    profilePhoto: string | null;
  } | null;
  teacherProfile: {
    profilePhoto: string | null;
  } | null;
}

interface MessageUserRow {
  id: string;
  image: string | null;
  name: string;
  role: string;
  studentProfile: {
    profilePhoto: string | null;
  } | null;
  teacherProfile: {
    profilePhoto: string | null;
  } | null;
}

interface ConversationRow {
  createdAt: Date;
  id: string;
  lastMessageAt: Date | null;
  participantOne: ParticipantUserRow;
  participantTwo: ParticipantUserRow;
  updatedAt: Date;
}

interface MessageRow {
  content: string;
  conversationId: string;
  createdAt: Date;
  id: string;
  readAt: Date | null;
  sender: MessageUserRow;
  senderId: string;
}

export interface MessageParticipantRecord {
  email: string;
  id: string;
  image: string | null;
  isActive: boolean;
  name: string;
  role: UserRole;
}

export interface ConversationMessageRecord {
  content: string;
  conversationId: string;
  createdAt: Date;
  id: string;
  readAt: Date | null;
  sender: MessageParticipantRecord;
  senderId: string;
}

export interface ConversationRecord {
  createdAt: Date;
  id: string;
  lastMessage: ConversationMessageRecord | null;
  lastMessageAt: Date | null;
  participantOne: MessageParticipantRecord;
  participantTwo: MessageParticipantRecord;
  unreadCount: number;
  updatedAt: Date;
}

function resolveProfileImage(
  user:
    | {
        image: string | null;
        studentProfile: { profilePhoto: string | null } | null;
        teacherProfile: { profilePhoto: string | null } | null;
      }
    | MessageUserRow
    | ParticipantUserRow
): string | null {
  return user.teacherProfile?.profilePhoto ?? user.studentProfile?.profilePhoto ?? user.image;
}

function mapParticipant(user: ParticipantUserRow): MessageParticipantRecord {
  return {
    email: user.email,
    id: user.id,
    image: resolveProfileImage(user),
    isActive: user.isActive,
    name: user.name,
    role: user.role as UserRole
  };
}

function mapMessageParticipant(user: MessageUserRow): MessageParticipantRecord {
  return {
    email: "",
    id: user.id,
    image: resolveProfileImage(user),
    isActive: true,
    name: user.name,
    role: user.role as UserRole
  };
}

function mapMessage(row: MessageRow): ConversationMessageRecord {
  return {
    content: row.content,
    conversationId: row.conversationId,
    createdAt: row.createdAt,
    id: row.id,
    readAt: row.readAt,
    sender: mapMessageParticipant(row.sender),
    senderId: row.senderId
  };
}

function normalizeParticipantPair(userAId: string, userBId: string): {
  participantOneId: string;
  participantTwoId: string;
} {
  return userAId < userBId
    ? {
        participantOneId: userAId,
        participantTwoId: userBId
      }
    : {
        participantOneId: userBId,
        participantTwoId: userAId
      };
}

export class MessageRepository {
  public async findActiveUserById(userId: string): Promise<MessageParticipantRecord | null> {
    const user = await db.query.users.findFirst({
      columns: {
        email: true,
        id: true,
        image: true,
        isActive: true,
        name: true,
        role: true
      },
      where: eq(users.id, userId),
      with: {
        studentProfile: {
          columns: {
            profilePhoto: true
          }
        },
        teacherProfile: {
          columns: {
            profilePhoto: true
          }
        }
      }
    });

    if (!user) {
      return null;
    }

    return mapParticipant(user);
  }

  public async searchEligibleParticipants(input: {
    currentUserId: string;
    currentUserRole: "STUDENT" | "TEACHER";
    limit: number;
    search?: string | undefined;
  }): Promise<readonly MessageParticipantRecord[]> {
    const targetRole = input.currentUserRole === "STUDENT" ? "TEACHER" : "STUDENT";
    const searchTerm = input.search?.trim();
    const searchFilter =
      searchTerm && searchTerm.length > 0
        ? or(ilike(users.name, `%${searchTerm}%`), ilike(users.email, `%${searchTerm}%`))
        : undefined;

    const rows = await db.query.users.findMany({
      columns: {
        email: true,
        id: true,
        image: true,
        isActive: true,
        name: true,
        role: true
      },
      limit: input.limit,
      orderBy: (table, { asc }) => [asc(table.name)],
      where: searchFilter
        ? and(
            eq(users.isActive, true),
            eq(users.role, targetRole),
            ne(users.id, input.currentUserId),
            searchFilter
          )
        : and(eq(users.isActive, true), eq(users.role, targetRole), ne(users.id, input.currentUserId)),
      with: {
        studentProfile: {
          columns: {
            profilePhoto: true
          }
        },
        teacherProfile: {
          columns: {
            profilePhoto: true
          }
        }
      }
    });

    return rows.map(mapParticipant);
  }

  public async findConversationBetweenUsers(
    userAId: string,
    userBId: string,
    currentUserIdForUnreadCount: string
  ): Promise<ConversationRecord | null> {
    const normalized = normalizeParticipantPair(userAId, userBId);

    const row = await db.query.conversations.findFirst({
      columns: {
        createdAt: true,
        id: true,
        lastMessageAt: true,
        updatedAt: true
      },
      where: and(
        eq(conversations.participantOneId, normalized.participantOneId),
        eq(conversations.participantTwoId, normalized.participantTwoId)
      ),
      with: {
        messages: {
          columns: {
            content: true,
            conversationId: true,
            createdAt: true,
            id: true,
            readAt: true,
            senderId: true
          },
          limit: 1,
          orderBy: [desc(messages.createdAt)],
          with: {
            sender: {
              columns: {
                id: true,
                image: true,
                name: true,
                role: true
              },
              with: {
                studentProfile: {
                  columns: {
                    profilePhoto: true
                  }
                },
                teacherProfile: {
                  columns: {
                    profilePhoto: true
                  }
                }
              }
            }
          }
        },
        participantOne: {
          columns: {
            email: true,
            id: true,
            image: true,
            isActive: true,
            name: true,
            role: true
          },
          with: {
            studentProfile: {
              columns: {
                profilePhoto: true
              }
            },
            teacherProfile: {
              columns: {
                profilePhoto: true
              }
            }
          }
        },
        participantTwo: {
          columns: {
            email: true,
            id: true,
            image: true,
            isActive: true,
            name: true,
            role: true
          },
          with: {
            studentProfile: {
              columns: {
                profilePhoto: true
              }
            },
            teacherProfile: {
              columns: {
                profilePhoto: true
              }
            }
          }
        }
      }
    });

    if (!row) {
      return null;
    }

    const unreadCount = await this.countUnreadMessages(row.id, currentUserIdForUnreadCount);

    return {
      createdAt: row.createdAt,
      id: row.id,
      lastMessage: row.messages[0] ? mapMessage(row.messages[0] as MessageRow) : null,
      lastMessageAt: row.lastMessageAt,
      participantOne: mapParticipant(row.participantOne as ParticipantUserRow),
      participantTwo: mapParticipant(row.participantTwo as ParticipantUserRow),
      unreadCount,
      updatedAt: row.updatedAt
    };
  }

  public async createConversation(userAId: string, userBId: string): Promise<ConversationRecord> {
    const normalized = normalizeParticipantPair(userAId, userBId);
    const [row] = await db
      .insert(conversations)
      .values({
        lastMessageAt: null,
        participantOneId: normalized.participantOneId,
        participantTwoId: normalized.participantTwoId
      })
      .returning({ id: conversations.id });

    if (!row) {
      throw new Error("Failed to create conversation");
    }

    const conversation = await this.findConversationById(row.id, userAId);

    if (!conversation) {
      throw new Error("Failed to load conversation");
    }

    return conversation;
  }

  public async findConversationById(
    conversationId: string,
    currentUserIdForUnreadCount: string
  ): Promise<ConversationRecord | null> {
    const row = await db.query.conversations.findFirst({
      columns: {
        createdAt: true,
        id: true,
        lastMessageAt: true,
        updatedAt: true
      },
      where: eq(conversations.id, conversationId),
      with: {
        messages: {
          columns: {
            content: true,
            conversationId: true,
            createdAt: true,
            id: true,
            readAt: true,
            senderId: true
          },
          limit: 1,
          orderBy: [desc(messages.createdAt)],
          with: {
            sender: {
              columns: {
                id: true,
                image: true,
                name: true,
                role: true
              },
              with: {
                studentProfile: {
                  columns: {
                    profilePhoto: true
                  }
                },
                teacherProfile: {
                  columns: {
                    profilePhoto: true
                  }
                }
              }
            }
          }
        },
        participantOne: {
          columns: {
            email: true,
            id: true,
            image: true,
            isActive: true,
            name: true,
            role: true
          },
          with: {
            studentProfile: {
              columns: {
                profilePhoto: true
              }
            },
            teacherProfile: {
              columns: {
                profilePhoto: true
              }
            }
          }
        },
        participantTwo: {
          columns: {
            email: true,
            id: true,
            image: true,
            isActive: true,
            name: true,
            role: true
          },
          with: {
            studentProfile: {
              columns: {
                profilePhoto: true
              }
            },
            teacherProfile: {
              columns: {
                profilePhoto: true
              }
            }
          }
        }
      }
    });

    if (!row) {
      return null;
    }

    const unreadCount = await this.countUnreadMessages(row.id, currentUserIdForUnreadCount);

    return {
      createdAt: row.createdAt,
      id: row.id,
      lastMessage: row.messages[0] ? mapMessage(row.messages[0] as MessageRow) : null,
      lastMessageAt: row.lastMessageAt,
      participantOne: mapParticipant(row.participantOne as ParticipantUserRow),
      participantTwo: mapParticipant(row.participantTwo as ParticipantUserRow),
      unreadCount,
      updatedAt: row.updatedAt
    };
  }

  public async listConversationsForUser(
    currentUserId: string,
    search?: string | undefined
  ): Promise<readonly ConversationRecord[]> {
    const rows = await db.query.conversations.findMany({
      columns: {
        createdAt: true,
        id: true,
        lastMessageAt: true,
        updatedAt: true
      },
      orderBy: [desc(conversations.lastMessageAt), desc(conversations.updatedAt)],
      where: or(eq(conversations.participantOneId, currentUserId), eq(conversations.participantTwoId, currentUserId)),
      with: {
        messages: {
          columns: {
            content: true,
            conversationId: true,
            createdAt: true,
            id: true,
            readAt: true,
            senderId: true
          },
          limit: 1,
          orderBy: [desc(messages.createdAt)],
          with: {
            sender: {
              columns: {
                id: true,
                image: true,
                name: true,
                role: true
              },
              with: {
                studentProfile: {
                  columns: {
                    profilePhoto: true
                  }
                },
                teacherProfile: {
                  columns: {
                    profilePhoto: true
                  }
                }
              }
            }
          }
        },
        participantOne: {
          columns: {
            email: true,
            id: true,
            image: true,
            isActive: true,
            name: true,
            role: true
          },
          with: {
            studentProfile: {
              columns: {
                profilePhoto: true
              }
            },
            teacherProfile: {
              columns: {
                profilePhoto: true
              }
            }
          }
        },
        participantTwo: {
          columns: {
            email: true,
            id: true,
            image: true,
            isActive: true,
            name: true,
            role: true
          },
          with: {
            studentProfile: {
              columns: {
                profilePhoto: true
              }
            },
            teacherProfile: {
              columns: {
                profilePhoto: true
              }
            }
          }
        }
      }
    });

    const mapped = await Promise.all(
      rows.map(async (row) => ({
        createdAt: row.createdAt,
        id: row.id,
        lastMessage: row.messages[0] ? mapMessage(row.messages[0] as MessageRow) : null,
        lastMessageAt: row.lastMessageAt,
        participantOne: mapParticipant(row.participantOne as ParticipantUserRow),
        participantTwo: mapParticipant(row.participantTwo as ParticipantUserRow),
        unreadCount: await this.countUnreadMessages(row.id, currentUserId),
        updatedAt: row.updatedAt
      }))
    );

    const searchTerm = search?.trim().toLowerCase();

    if (!searchTerm) {
      return mapped;
    }

    return mapped.filter((conversation) => {
      const counterpart =
        conversation.participantOne.id === currentUserId
          ? conversation.participantTwo
          : conversation.participantOne;

      return (
        counterpart.name.toLowerCase().includes(searchTerm) ||
        counterpart.email.toLowerCase().includes(searchTerm) ||
        (conversation.lastMessage?.content.toLowerCase().includes(searchTerm) ?? false)
      );
    });
  }

  public async listMessagesByConversation(input: {
    conversationId: string;
    cursor?: string | undefined;
    limit: number;
  }): Promise<readonly ConversationMessageRecord[]> {
    const rows = await db.query.messages.findMany({
      columns: {
        content: true,
        conversationId: true,
        createdAt: true,
        id: true,
        readAt: true,
        senderId: true
      },
      limit: input.limit,
      orderBy: [desc(messages.createdAt)],
      where: input.cursor
        ? and(
            eq(messages.conversationId, input.conversationId),
            lt(messages.createdAt, new Date(input.cursor))
          )
        : eq(messages.conversationId, input.conversationId),
      with: {
        sender: {
          columns: {
            id: true,
            image: true,
            name: true,
            role: true
          },
          with: {
            studentProfile: {
              columns: {
                profilePhoto: true
              }
            },
            teacherProfile: {
              columns: {
                profilePhoto: true
              }
            }
          }
        }
      }
    });

    return rows.map((row) => mapMessage(row as MessageRow));
  }

  public async findMessageById(messageId: string): Promise<ConversationMessageRecord | null> {
    const row = await db.query.messages.findFirst({
      columns: {
        content: true,
        conversationId: true,
        createdAt: true,
        id: true,
        readAt: true,
        senderId: true
      },
      where: eq(messages.id, messageId),
      with: {
        sender: {
          columns: {
            id: true,
            image: true,
            name: true,
            role: true
          },
          with: {
            studentProfile: {
              columns: {
                profilePhoto: true
              }
            },
            teacherProfile: {
              columns: {
                profilePhoto: true
              }
            }
          }
        }
      }
    });

    return row ? mapMessage(row as MessageRow) : null;
  }

  public async createMessage(conversationId: string, senderId: string, content: string): Promise<ConversationMessageRecord> {
    const [row] = await db
      .insert(messages)
      .values({
        content,
        conversationId,
        senderId
      })
      .returning({ id: messages.id });

    if (!row) {
      throw new Error("Failed to create message");
    }

    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(conversations.id, conversationId));

    const message = await this.findMessageById(row.id);

    if (!message) {
      throw new Error("Failed to load created message");
    }

    return message;
  }

  public async markConversationRead(
    conversationId: string,
    currentUserId: string
  ): Promise<readonly ConversationMessageRecord[]> {
    const rows = await db
      .update(messages)
      .set({
        readAt: new Date()
      })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          ne(messages.senderId, currentUserId),
          isNull(messages.readAt)
        )
      )
      .returning({ id: messages.id });

    if (rows.length === 0) {
      return [];
    }

    const records = await Promise.all(rows.map((row) => this.findMessageById(row.id)));

    return records.filter((record): record is ConversationMessageRecord => record !== null);
  }

  public async countUnreadMessages(conversationId: string, currentUserId: string): Promise<number> {
    const rows = await db
      .select({ value: count() })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          ne(messages.senderId, currentUserId),
          isNull(messages.readAt)
        )
      );

    return rows[0]?.value ?? 0;
  }
}
