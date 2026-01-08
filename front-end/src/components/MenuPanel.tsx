import { X, User, Car, CreditCard, AlertCircle, LogOut } from 'lucide-react';

interface MenuPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MenuPanel({ isOpen, onClose }: MenuPanelProps) {
  const menuItems = [
    {
      icon: User,
      label: 'View Profile',
      onClick: () => {
        // TODO: Add profile functionality
        console.log('View Profile clicked');
      },
    },
    {
      icon: Car,
      label: 'View Personal Vehicles',
      onClick: () => {
        // TODO: Add vehicles functionality
        console.log('View Personal Vehicles clicked');
      },
    },
    {
      icon: CreditCard,
      label: 'View Billing and Charging History',
      onClick: () => {
        // TODO: Add billing history functionality
        console.log('View Billing and Charging History clicked');
      },
    },
    {
      icon: AlertCircle,
      label: 'Report a Problem',
      onClick: () => {
        // TODO: Add report problem functionality
        console.log('Report a Problem clicked');
      },
    },
    {
      icon: LogOut,
      label: 'Sign Out',
      onClick: () => {
        // TODO: Add sign out functionality
        console.log('Sign Out clicked');
      },
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-[1001] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div
        className={`fixed top-14 left-3 sm:top-16 sm:left-4 lg:top-20 lg:left-6 bg-white rounded-lg shadow-2xl z-[1002] w-[calc(100vw-24px)] max-w-[320px] transition-all duration-300 ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium">Menu</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="p-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={() => {
                  item.onClick();
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
              >
                <Icon className="w-5 h-5 text-gray-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
