/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotificationsDropdown } from "@/components/ui/NotificationsDropdown";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock useAdminNotifications hook
jest.mock("@/hooks/useAdminNotifications", () => ({
  useAdminNotifications: jest.fn(),
  AdminNotification: {},
}));

// Mock UI components
jest.mock("@/components/ui", () => ({
  Button: ({ children, onClick, ...props }: React.ComponentProps<'button'>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Modal: ({ isOpen, onClose, title, children }: { 
    isOpen: boolean; 
    onClose: () => void; 
    title: string; 
    children: React.ReactNode 
  }) =>
    isOpen ? (
      <div role="dialog" data-testid="modal">
        <h2>{title}</h2>
        <button onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null,
}));

// Mock NotificationToastContainer
jest.mock("@/components/admin/NotificationToast", () => ({
  NotificationToastContainer: ({ toasts }: { 
    toasts: Array<{ id: string; type: string; summary: string }> 
  }) =>
    toasts.length > 0 ? (
      <div data-testid="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} data-testid={`toast-${toast.id}`}>
            {toast.summary}
          </div>
        ))}
      </div>
    ) : null,
}));

const mockUseAdminNotifications = useAdminNotifications as jest.Mock;

const mockNotifications = [
  {
    id: "notif-1",
    type: "REQUESTED" as const,
    playerId: "player-1",
    playerName: "John Doe",
    playerEmail: "john@example.com",
    coachId: "coach-1",
    coachName: "Jane Smith",
    trainingRequestId: "req-1",
    bookingId: null,
    sessionDate: "2024-01-15",
    sessionTime: "10:00",
    courtInfo: "Court 1",
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "notif-2",
    type: "ACCEPTED" as const,
    playerId: "player-2",
    playerName: "Alice Brown",
    playerEmail: "alice@example.com",
    coachId: "coach-1",
    coachName: "Jane Smith",
    trainingRequestId: "req-2",
    bookingId: "book-1",
    sessionDate: "2024-01-16",
    sessionTime: "14:00",
    courtInfo: "Court 2",
    read: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
];

describe("NotificationsDropdown Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the notification bell button", () => {
      mockUseAdminNotifications.mockReturnValue({
        notifications: [],
        unreadCount: 0,
        loading: false,
        error: null,
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
        connectionStatus: "connected",
      });

      render(<NotificationsDropdown />);
      expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument();
    });

    it("shows unread count badge when there are unread notifications", () => {
      mockUseAdminNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 1,
        loading: false,
        error: null,
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
        connectionStatus: "connected",
      });

      render(<NotificationsDropdown />);
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("shows 99+ for counts over 99", () => {
      mockUseAdminNotifications.mockReturnValue({
        notifications: [],
        unreadCount: 150,
        loading: false,
        error: null,
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
        connectionStatus: "connected",
      });

      render(<NotificationsDropdown />);
      expect(screen.getByText("99+")).toBeInTheDocument();
    });

    it("displays connection status indicator", () => {
      mockUseAdminNotifications.mockReturnValue({
        notifications: [],
        unreadCount: 0,
        loading: false,
        error: null,
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
        connectionStatus: "connected",
      });

      render(<NotificationsDropdown />);
      const statusIndicator = document.querySelector(".tm-bell-status--connected");
      expect(statusIndicator).toBeInTheDocument();
    });
  });

  describe("Dropdown Behavior", () => {
    it("opens dropdown when bell button is clicked", () => {
      mockUseAdminNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 1,
        loading: false,
        error: null,
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
        connectionStatus: "connected",
      });

      render(<NotificationsDropdown />);
      const bellButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(bellButton);

      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("closes dropdown when clicking outside", () => {
      mockUseAdminNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 1,
        loading: false,
        error: null,
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
        connectionStatus: "connected",
      });

      render(<NotificationsDropdown />);
      const bellButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(bellButton);

      expect(screen.getByRole("menu")).toBeInTheDocument();

      // Click outside
      fireEvent.mouseDown(document.body);

      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("displays notifications in dropdown", () => {
      mockUseAdminNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 1,
        loading: false,
        error: null,
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
        connectionStatus: "connected",
      });

      render(<NotificationsDropdown />);
      const bellButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(bellButton);

      // Check that at least the player names appear in the notifications
      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      // Jane Smith appears multiple times (in both notifications), so use getAllByText
      const janeSmithElements = screen.getAllByText(/jane smith/i);
      expect(janeSmithElements.length).toBeGreaterThan(0);
    });

    it("shows empty state when no notifications", () => {
      mockUseAdminNotifications.mockReturnValue({
        notifications: [],
        unreadCount: 0,
        loading: false,
        error: null,
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
        connectionStatus: "connected",
      });

      render(<NotificationsDropdown />);
      const bellButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(bellButton);

      expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
    });

    it("shows loading state", () => {
      mockUseAdminNotifications.mockReturnValue({
        notifications: [],
        unreadCount: 0,
        loading: true,
        error: null,
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
        connectionStatus: "connecting",
      });

      render(<NotificationsDropdown />);
      const bellButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(bellButton);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it("shows error state", () => {
      mockUseAdminNotifications.mockReturnValue({
        notifications: [],
        unreadCount: 0,
        loading: false,
        error: "Failed to load notifications",
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
        connectionStatus: "disconnected",
      });

      render(<NotificationsDropdown />);
      const bellButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(bellButton);

      expect(screen.getByText(/failed to load notifications/i)).toBeInTheDocument();
    });
  });

  describe("Mark as Read", () => {
    it("calls markAsRead when notification is clicked", async () => {
      const markAsReadMock = jest.fn().mockResolvedValue(undefined);
      mockUseAdminNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 1,
        loading: false,
        error: null,
        markAsRead: markAsReadMock,
        markAllAsRead: jest.fn(),
        connectionStatus: "connected",
      });

      render(<NotificationsDropdown />);
      const bellButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(bellButton);

      const notificationButton = screen.getByText(/john doe/i).closest("button");
      if (notificationButton) {
        fireEvent.click(notificationButton);

        await waitFor(() => {
          expect(markAsReadMock).toHaveBeenCalledWith("notif-1");
        });
      }
    });

    it("shows mark all read button when there are unread notifications", () => {
      mockUseAdminNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 1,
        loading: false,
        error: null,
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
        connectionStatus: "connected",
      });

      render(<NotificationsDropdown />);
      const bellButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(bellButton);

      expect(screen.getByText(/mark all read/i)).toBeInTheDocument();
    });

    it("calls markAllAsRead when mark all read button is clicked", async () => {
      const markAllAsReadMock = jest.fn().mockResolvedValue(undefined);
      mockUseAdminNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 1,
        loading: false,
        error: null,
        markAsRead: jest.fn(),
        markAllAsRead: markAllAsReadMock,
        connectionStatus: "connected",
      });

      render(<NotificationsDropdown />);
      const bellButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(bellButton);

      const markAllButton = screen.getByText(/mark all read/i);
      fireEvent.click(markAllButton);

      await waitFor(() => {
        expect(markAllAsReadMock).toHaveBeenCalled();
      });
    });
  });

  describe("Keyboard Accessibility", () => {
    it("opens dropdown on Enter key", () => {
      mockUseAdminNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 1,
        loading: false,
        error: null,
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
        connectionStatus: "connected",
      });

      render(<NotificationsDropdown />);
      const bellButton = screen.getByLabelText(/notifications/i);
      fireEvent.keyDown(bellButton, { key: "Enter" });

      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("closes dropdown on Escape key", () => {
      mockUseAdminNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 1,
        loading: false,
        error: null,
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
        connectionStatus: "connected",
      });

      render(<NotificationsDropdown />);
      const bellButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(bellButton);

      expect(screen.getByRole("menu")).toBeInTheDocument();

      fireEvent.keyDown(bellButton, { key: "Escape" });

      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("has proper aria attributes", () => {
      mockUseAdminNotifications.mockReturnValue({
        notifications: [],
        unreadCount: 0,
        loading: false,
        error: null,
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
        connectionStatus: "connected",
      });

      render(<NotificationsDropdown />);
      const bellButton = screen.getByLabelText(/notifications/i);

      expect(bellButton).toHaveAttribute("aria-expanded", "false");
      expect(bellButton).toHaveAttribute("aria-haspopup", "true");
    });
  });

  describe("Max Dropdown Items", () => {
    it("limits displayed notifications to maxDropdownItems prop", () => {
      const manyNotifications = Array.from({ length: 20 }, (_, i) => ({
        ...mockNotifications[0],
        id: `notif-${i}`,
        playerName: `Player ${i}`,
      }));

      mockUseAdminNotifications.mockReturnValue({
        notifications: manyNotifications,
        unreadCount: 20,
        loading: false,
        error: null,
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
        connectionStatus: "connected",
      });

      render(<NotificationsDropdown maxDropdownItems={5} />);
      const bellButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(bellButton);

      const items = screen.getAllByRole("option");
      expect(items).toHaveLength(5);
    });
  });
});
