import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Edit, 
  Users, 
  FileText, 
  Car, 
  Building2, 
  MessageSquare, 
  TrendingUp, 
  Settings, 
  FileCheck,
  UserPlus,
  Info,
  CalendarOff,
  CreditCard,
  Wallet,
  XCircle,
  RefreshCw,
  Ban
} from "lucide-react";

export type PermissionLevel = {
  view: boolean;
  edit: boolean;
  downloadCsv?: boolean;
};

export type UserPermissions = {
  blogPosts?: PermissionLevel;
  portfolioClients?: PermissionLevel;
  corporateBookings?: PermissionLevel;
  rentalBookings?: PermissionLevel;
  vendorRegistrations?: PermissionLevel;
  contactMessages?: PermissionLevel;
  marketingSettings?: PermissionLevel;
  websiteSettings?: PermissionLevel;
  legalPages?: PermissionLevel;
  driverManagement?: PermissionLevel;
  driverAssignment?: boolean;
  carpoolBlackoutDates?: PermissionLevel;
  employeeManagement?: PermissionLevel;
  subscriptionManagement?: PermissionLevel;
  walletManagement?: PermissionLevel;
  subscriptionCancellation?: boolean;
  walletRefunds?: boolean;
  userBanManagement?: boolean;
};

interface PermissionMatrixProps {
  permissions: UserPermissions;
  onChange: (permissions: UserPermissions) => void;
}

interface PermissionSection {
  key: keyof UserPermissions;
  label: string;
  icon: React.ReactNode;
  description: string;
  hasCsv: boolean;
  isSpecial?: boolean; // For driverAssignment which is a boolean
}

const permissionSections: PermissionSection[] = [
  {
    key: "blogPosts",
    label: "Blog Posts",
    icon: <Edit className="h-4 w-4" />,
    description: "Manage blog posts and articles",
    hasCsv: false,
  },
  {
    key: "portfolioClients",
    label: "Portfolio Clients",
    icon: <Users className="h-4 w-4" />,
    description: "Manage portfolio client showcase",
    hasCsv: false,
  },
  {
    key: "corporateBookings",
    label: "Corporate Bookings",
    icon: <Building2 className="h-4 w-4" />,
    description: "View and manage corporate booking submissions",
    hasCsv: true,
  },
  {
    key: "rentalBookings",
    label: "Rental Bookings",
    icon: <Car className="h-4 w-4" />,
    description: "View and manage rental booking submissions",
    hasCsv: true,
  },
  {
    key: "vendorRegistrations",
    label: "Vendor Registrations",
    icon: <UserPlus className="h-4 w-4" />,
    description: "View and manage vendor registration submissions",
    hasCsv: true,
  },
  {
    key: "contactMessages",
    label: "Contact Messages",
    icon: <MessageSquare className="h-4 w-4" />,
    description: "View and manage contact form submissions",
    hasCsv: true,
  },
  {
    key: "marketingSettings",
    label: "Marketing Settings",
    icon: <TrendingUp className="h-4 w-4" />,
    description: "Configure marketing integrations (GA4, Facebook Pixel)",
    hasCsv: false,
  },
  {
    key: "websiteSettings",
    label: "Website Settings",
    icon: <Settings className="h-4 w-4" />,
    description: "Configure website appearance and branding",
    hasCsv: false,
  },
  {
    key: "legalPages",
    label: "Legal Pages",
    icon: <FileCheck className="h-4 w-4" />,
    description: "Manage Terms of Service and Privacy Policy",
    hasCsv: false,
  },
  {
    key: "driverManagement",
    label: "Driver Management",
    icon: <Car className="h-4 w-4" />,
    description: "Manage driver records and vehicle details",
    hasCsv: true,
  },
  {
    key: "driverAssignment",
    label: "Driver Assignment",
    icon: <Car className="h-4 w-4" />,
    description: "Assign drivers to rental bookings",
    hasCsv: false,
    isSpecial: true,
  },
  {
    key: "carpoolBlackoutDates",
    label: "Carpool Blackout Dates",
    icon: <CalendarOff className="h-4 w-4" />,
    description: "Manage service blackout dates for carpool routes",
    hasCsv: false,
  },
  {
    key: "employeeManagement",
    label: "Employee Management",
    icon: <Users className="h-4 w-4" />,
    description: "Manage employee accounts and permissions (Superadmin only)",
    hasCsv: false,
  },
  {
    key: "subscriptionManagement",
    label: "Subscription Management",
    icon: <CreditCard className="h-4 w-4" />,
    description: "View and manage user subscriptions and invoices",
    hasCsv: true,
  },
  {
    key: "walletManagement",
    label: "Wallet Management",
    icon: <Wallet className="h-4 w-4" />,
    description: "Manage user wallets and perform adjustments",
    hasCsv: true,
  },
  {
    key: "subscriptionCancellation",
    label: "Cancel Subscriptions",
    icon: <XCircle className="h-4 w-4" />,
    description: "Cancel user subscriptions with prorated refunds",
    hasCsv: false,
    isSpecial: true,
  },
  {
    key: "walletRefunds",
    label: "Issue Refunds",
    icon: <RefreshCw className="h-4 w-4" />,
    description: "Manually issue refunds to user wallets",
    hasCsv: false,
    isSpecial: true,
  },
  {
    key: "userBanManagement",
    label: "Ban/Unban Users",
    icon: <Ban className="h-4 w-4" />,
    description: "Ban or unban users from the platform",
    hasCsv: false,
    isSpecial: true,
  },
];

export function PermissionMatrix({ permissions, onChange }: PermissionMatrixProps) {
  const handlePermissionChange = (
    sectionKey: keyof UserPermissions,
    action: 'view' | 'edit' | 'downloadCsv' | 'special',
    value: boolean
  ) => {
    const currentSection = permissions[sectionKey];
    
    // Special handling for driverAssignment (boolean)
    if (action === 'special') {
      onChange({
        ...permissions,
        [sectionKey]: value,
      });
      return;
    }

    // For regular permissions
    const updatedSection = {
      ...(typeof currentSection === 'object' ? currentSection : { view: false, edit: false }),
      [action]: value,
    } as PermissionLevel;

    onChange({
      ...permissions,
      [sectionKey]: updatedSection,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-semibold mb-1">Permission Levels Explained:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li><strong>View:</strong> Can see and read data in this section</li>
            <li><strong>Edit:</strong> Can create, update, and delete data in this section</li>
            <li><strong>Download CSV:</strong> Can export data to spreadsheet files</li>
          </ul>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="bg-gray-50 dark:bg-gray-800">
              <TableHead className="w-[35%] bg-gray-50 dark:bg-gray-800">Section</TableHead>
              <TableHead className="text-center w-[15%] bg-gray-50 dark:bg-gray-800">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>View</TooltipTrigger>
                    <TooltipContent>
                      <p>Can see and read data</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead className="text-center w-[15%] bg-gray-50 dark:bg-gray-800">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>Edit</TooltipTrigger>
                    <TooltipContent>
                      <p>Can create, update, and delete</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead className="text-center w-[20%] bg-gray-50 dark:bg-gray-800">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>Download CSV</TooltipTrigger>
                    <TooltipContent>
                      <p>Can export data to spreadsheet</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissionSections.map((section) => {
              const perm = permissions[section.key];
              const isBoolean = section.isSpecial && typeof perm === 'boolean';
              const permLevel = !isBoolean && typeof perm === 'object' ? perm : { view: false, edit: false, downloadCsv: false };

              return (
                <TableRow key={section.key} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0 text-gray-600 dark:text-gray-400">
                        {section.icon}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {section.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {section.description}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  {/* View Permission */}
                  <TableCell className="text-center">
                    {isBoolean ? (
                      <span className="text-gray-400 dark:text-gray-600 text-xs">N/A</span>
                    ) : (
                      <Switch
                        checked={permLevel.view}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(section.key, 'view', checked)
                        }
                        data-testid={`switch-${section.key}-view`}
                      />
                    )}
                  </TableCell>

                  {/* Edit Permission */}
                  <TableCell className="text-center">
                    {isBoolean ? (
                      <Switch
                        checked={perm as boolean}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(section.key, 'special', checked)
                        }
                        data-testid={`switch-${section.key}-assign`}
                      />
                    ) : (
                      <Switch
                        checked={permLevel.edit}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(section.key, 'edit', checked)
                        }
                        data-testid={`switch-${section.key}-edit`}
                      />
                    )}
                  </TableCell>

                  {/* Download CSV Permission */}
                  <TableCell className="text-center">
                    {!section.hasCsv || isBoolean ? (
                      <span className="text-gray-400 dark:text-gray-600 text-xs">N/A</span>
                    ) : (
                      <Switch
                        checked={permLevel.downloadCsv || false}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(section.key, 'downloadCsv', checked)
                        }
                        data-testid={`switch-${section.key}-csv`}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
