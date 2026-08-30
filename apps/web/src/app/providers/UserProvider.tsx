import React, { useContext } from 'react';
import { PropsWithChildren, useEffect, useState } from 'react';
import { RxDocument } from 'rxdb';
import { Subscription } from 'rxjs';
import { UserDocument } from '../../models/user-document/UserDocument.type';
import { useUserRepository } from '../../repositories';

type UserProviderProps = PropsWithChildren<unknown>;

type UserManagement = {
  allUsers: RxDocument<UserDocument>[];
  switchUser: (userId: string) => Promise<void>;
  createNewUser: (
    userData: Partial<UserDocument>,
  ) => Promise<RxDocument<UserDocument>>;
  /** Removes the profile and everything filed under it. */
  deleteUser: (userId: string) => Promise<void>;
  /** How many records would go with it, for the confirmation. */
  countUserRecords: (userId: string) => Promise<number>;
  /** Clears away unused, empty profiles the app created for you. */
  removeEmptyPlaceholders: () => Promise<number>;
};

const UserContext = React.createContext<UserDocument | undefined>(undefined);
const RawUserContext = React.createContext<RxDocument<UserDocument> | null>(
  null,
);
const AllUsersContext = React.createContext<RxDocument<UserDocument>[]>([]);
const UserManagementContext = React.createContext<UserManagement | null>(null);

export function UserProvider(props: UserProviderProps) {
  const userRepo = useUserRepository();
  const [user, setUser] = useState<UserDocument | undefined>(undefined);
  const [rawUser, setRawUser] = useState<RxDocument<UserDocument> | null>(null);
  const [allUsers, setAllUsers] = useState<RxDocument<UserDocument>[]>([]);

  useEffect(() => {
    if (!userRepo) return;

    let userSub: Subscription | undefined;
    let allUsersSub: Subscription | undefined;

    userRepo.createDefaultUserIfNone().then(() => {
      userSub = userRepo.watchSelectedUser().subscribe((item) => {
        if (item) {
          setUser(item.user);
          setRawUser(item.rawUser);
        }
      });

      allUsersSub = userRepo.watchAllUsersWithDocs().subscribe((users) => {
        setAllUsers(users);
      });
    });

    return () => {
      userSub?.unsubscribe();
      allUsersSub?.unsubscribe();
    };
  }, [userRepo]);

  const userManagement: UserManagement = React.useMemo(
    () => ({
      allUsers,
      switchUser: async (userId: string) => {
        if (!userRepo) {
          throw new Error('UserRepository not initialized');
        }
        await userRepo.switchUser(userId);
      },
      createNewUser: async (userData: Partial<UserDocument>) => {
        if (!userRepo) {
          throw new Error('UserRepository not initialized');
        }
        return userRepo.create(userData);
      },
      deleteUser: async (userId: string) => {
        if (!userRepo) {
          throw new Error('UserRepository not initialized');
        }
        await userRepo.delete(userId);
      },
      countUserRecords: async (userId: string) => {
        if (!userRepo) {
          throw new Error('UserRepository not initialized');
        }
        return userRepo.countRecords(userId);
      },
      removeEmptyPlaceholders: async () => {
        if (!userRepo) return 0;
        return userRepo.removeEmptyPlaceholders();
      },
    }),
    [allUsers, userRepo],
  );

  if (user) {
    return (
      <UserContext.Provider value={user}>
        <RawUserContext.Provider value={rawUser}>
          <AllUsersContext.Provider value={allUsers}>
            <UserManagementContext.Provider value={userManagement}>
              {props.children}
            </UserManagementContext.Provider>
          </AllUsersContext.Provider>
        </RawUserContext.Provider>
      </UserContext.Provider>
    );
  }

  return null;
}

/**
 * Gets a parsed user document from the context, not modifiable
 */
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

/**
 * The same user, for callers that can carry on without one.
 *
 * `useUser` throws outside a provider, which is right for anything that reads
 * or writes clinical data. A per-user *display* preference is not that: it
 * should quietly fall back to its default rather than take the screen down, and
 * a component test should not need a UserProvider to render a table.
 */
export function useOptionalUser() {
  return useContext(UserContext);
}

/**
 * Gets the raw user document from the context, modifiable
 */
export function useRxUserDocument() {
  const context = useContext(RawUserContext);
  return context;
}

/**
 * Gets all users from the context
 */
export function useAllUsers() {
  const context = useContext(AllUsersContext);
  return context;
}

/**
 * Gets user management functions
 */
export function useUserManagement() {
  const context = useContext(UserManagementContext);
  if (!context) {
    throw new Error('useUserManagement must be used within a UserProvider');
  }
  return context;
}
