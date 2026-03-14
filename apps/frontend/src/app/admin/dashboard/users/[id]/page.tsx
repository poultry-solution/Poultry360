"use client";

import { use } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Calendar,
  Tractor,
  Users,
  MessageCircle,
  Globe,
  Clock,
  CircleDot,
  Layers,
} from "lucide-react";
import {
  useGetAdminUserById,
  type AdminUserDetail,
} from "@/fetchers/admin/userQueries";

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-blue-100 text-blue-800",
  MANAGER: "bg-purple-100 text-purple-800",
  DOCTOR: "bg-green-100 text-green-800",
  DEALER: "bg-orange-100 text-orange-800",
  COMPANY: "bg-indigo-100 text-indigo-800",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-red-100 text-red-800",
  PENDING_VERIFICATION: "bg-yellow-100 text-yellow-800",
};

function StatCard({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: typeof Users;
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white p-4">
      <div className={`flex size-10 items-center justify-center rounded-lg ${color}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function FarmsSection({ title, farms }: {
  title: string;
  farms: AdminUserDetail["ownedFarms"];
}) {
  if (farms.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Tractor className="size-4" />
          {title}
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {farms.length} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Batches</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {farms.map((farm) => (
              <TableRow key={farm.id}>
                <TableCell>
                  <p className="font-medium">{farm.name}</p>
                  {farm.description && (
                    <p className="text-xs text-muted-foreground">{farm.description}</p>
                  )}
                </TableCell>
                <TableCell>{farm.capacity.toLocaleString()} birds</TableCell>
                <TableCell>{farm._count.batches}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(farm.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DealerConnectionsSection({ connections }: {
  connections: AdminUserDetail["dealerConnections"];
}) {
  if (connections.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4" />
          Connected Dealers
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {connections.length} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Connected Via</TableHead>
              <TableHead>Connected At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {connections.map((conn) => (
              <TableRow key={conn.dealer.id}>
                <TableCell className="font-medium">{conn.dealer.name}</TableCell>
                <TableCell className="text-muted-foreground">{conn.dealer.contact}</TableCell>
                <TableCell className="text-muted-foreground">{conn.dealer.address || "--"}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {conn.connectedVia || "Unknown"}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(conn.connectedAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DealerEntitySection({ dealer }: { dealer: NonNullable<AdminUserDetail["dealer"]> }) {
  return (
    <>
      {/* Dealer's companies */}
      {dealer.companies.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4" />
              Connected Companies
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {dealer.companies.length} total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Connected Via</TableHead>
                  <TableHead>Connected At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dealer.companies.map((conn) => (
                  <TableRow key={conn.company.id}>
                    <TableCell className="font-medium">{conn.company.name}</TableCell>
                    <TableCell className="text-muted-foreground">{conn.company.address || "--"}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {conn.connectedVia || "Unknown"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(conn.connectedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dealer's farmers */}
      {dealer.farmerConnections.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Tractor className="size-4" />
              Connected Farmers
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {dealer.farmerConnections.length} total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Connected Via</TableHead>
                  <TableHead>Connected At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dealer.farmerConnections.map((conn) => (
                  <TableRow key={conn.farmer.id}>
                    <TableCell className="font-medium">{conn.farmer.name}</TableCell>
                    <TableCell className="text-muted-foreground">{conn.farmer.phone}</TableCell>
                    <TableCell className="text-muted-foreground">{conn.farmer.CompanyFarmLocation || "--"}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {conn.connectedVia || "Unknown"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(conn.connectedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function CompanyEntitySection({ company }: { company: NonNullable<AdminUserDetail["company"]> }) {
  if (company.dealerCompanies.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4" />
          Connected Dealers
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {company.dealerCompanies.length} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dealer Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Connected Via</TableHead>
              <TableHead>Connected At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {company.dealerCompanies.map((conn) => (
              <TableRow key={conn.dealer.id}>
                <TableCell className="font-medium">{conn.dealer.name}</TableCell>
                <TableCell className="text-muted-foreground">{conn.dealer.contact}</TableCell>
                <TableCell className="text-muted-foreground">{conn.dealer.address || "--"}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {conn.connectedVia || "Unknown"}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(conn.connectedAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DoctorConversationsSection({ conversations }: {
  conversations: AdminUserDetail["doctorConversations"];
}) {
  if (conversations.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="size-4" />
          Patient Conversations
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {conversations.length} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Farmer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conversations.map((conv) => (
              <TableRow key={conv.id}>
                <TableCell className="font-medium">{conv.farmer.name}</TableCell>
                <TableCell className="text-muted-foreground">{conv.farmer.phone}</TableCell>
                <TableCell className="text-muted-foreground">{conv.subject || "--"}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    conv.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}>
                    {conv.status}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(conv.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, isError, refetch } = useGetAdminUserById(id);
  const user = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Back button skeleton */}
        <div className="h-9 w-32 rounded-md bg-muted" />

        {/* Hero card skeleton */}
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="h-2 bg-muted" />
          <div className="p-6">
            <div className="flex gap-6">
              <div className="size-16 shrink-0 rounded-full bg-muted" />
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-48 rounded bg-muted" />
                  <div className="h-5 w-16 rounded-full bg-muted" />
                  <div className="h-5 w-16 rounded-full bg-muted" />
                </div>
                <div className="h-4 w-36 rounded bg-muted" />
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-4 pt-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-5 w-32 rounded bg-muted" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stat cards skeleton */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border bg-white p-4">
              <div className="size-10 rounded-lg bg-muted" />
              <div className="space-y-1.5">
                <div className="h-7 w-10 rounded bg-muted" />
                <div className="h-3 w-14 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="rounded-xl border bg-white p-6 space-y-4">
          <div className="h-5 w-40 rounded bg-muted" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b last:border-0">
              <div className="h-4 w-36 rounded bg-muted" />
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-4 w-20 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">
          {isError ? "Failed to load user" : "User not found"}
        </p>
        <div className="mt-4 flex gap-2">
          <Link href="/admin/dashboard/users">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1 size-4" />
              Back to Users
            </Button>
          </Link>
          {isError && (
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Compute stats for the stat cards
  const farmCount = user.ownedFarms.length + user.managedFarms.length;
  const batchCount =
    user.ownedFarms.reduce((s, f) => s + f._count.batches, 0) +
    user.managedFarms.reduce((s, f) => s + f._count.batches, 0);

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/admin/dashboard/users">
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ArrowLeft className="size-4" />
          Back to Users
        </Button>
      </Link>

      {/* Profile Hero Card */}
      <Card className="overflow-hidden">
        {/* Colored top bar based on role */}
        <div
          className={`h-2 ${
            {
              OWNER: "bg-blue-500",
              MANAGER: "bg-purple-500",
              DOCTOR: "bg-green-500",
              DEALER: "bg-orange-500",
              COMPANY: "bg-indigo-500",
            }[user.role] ?? "bg-gray-500"
          }`}
        />
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Avatar circle */}
            <div
              className={`flex size-16 shrink-0 items-center justify-center rounded-full text-xl font-bold ${ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-800"}`}
            >
              {user.name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  {user.name}
                </h1>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[user.role] ?? ""}`}
                >
                  {user.role}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[user.status] ?? ""}`}
                >
                  {user.status === "PENDING_VERIFICATION" ? "PENDING" : user.status}
                </span>
                {user.isOnline && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                    <CircleDot className="size-3" />
                    Online
                  </span>
                )}
              </div>

              {user.companyName && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {user.companyName}
                </p>
              )}

              {/* Info grid */}
              <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="size-4 text-muted-foreground shrink-0" />
                  <span>{user.phone}</span>
                </div>
                {user.CompanyFarmLocation && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{user.CompanyFarmLocation}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="size-4 text-muted-foreground shrink-0" />
                  <span>{user.language} / {user.calendarType}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="size-4 text-muted-foreground shrink-0" />
                  <span>
                    Joined{" "}
                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {(user.lastSeen || !user.isOnline) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="size-4 shrink-0" />
                    <span>
                      {user.lastSeen
                        ? `Last seen ${new Date(user.lastSeen).toLocaleDateString()}`
                        : "Never seen"}
                    </span>
                  </div>
                )}
                {user.dealer && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{user.dealer.name}</span>
                  </div>
                )}
                {user.dealer?.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{user.dealer.address}</span>
                  </div>
                )}
                {user.company && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{user.company.name}</span>
                  </div>
                )}
                {user.company?.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{user.company.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {(user.role === "OWNER" || user.role === "MANAGER") && (
          <>
            <StatCard
              icon={Tractor}
              value={farmCount}
              label={farmCount !== 1 ? "Farms" : "Farm"}
              color="bg-emerald-100 text-emerald-700"
            />
            <StatCard
              icon={Layers}
              value={batchCount}
              label={batchCount !== 1 ? "Batches" : "Batch"}
              color="bg-sky-100 text-sky-700"
            />
            <StatCard
              icon={Users}
              value={user.dealerConnections.length}
              label={user.dealerConnections.length !== 1 ? "Dealers" : "Dealer"}
              color="bg-orange-100 text-orange-700"
            />
          </>
        )}
        {user.dealer && (
          <>
            <StatCard
              icon={Building2}
              value={user.dealer.companies.length}
              label={user.dealer.companies.length !== 1 ? "Companies" : "Company"}
              color="bg-indigo-100 text-indigo-700"
            />
            <StatCard
              icon={Tractor}
              value={user.dealer.farmerConnections.length}
              label={user.dealer.farmerConnections.length !== 1 ? "Farmers" : "Farmer"}
              color="bg-emerald-100 text-emerald-700"
            />
          </>
        )}
        {user.company && (
          <StatCard
            icon={Users}
            value={user.company.dealerCompanies.length}
            label={user.company.dealerCompanies.length !== 1 ? "Dealers" : "Dealer"}
            color="bg-orange-100 text-orange-700"
          />
        )}
        {user.role === "DOCTOR" && (
          <StatCard
            icon={MessageCircle}
            value={user.doctorConversations.length}
            label={user.doctorConversations.length !== 1 ? "Patients" : "Patient"}
            color="bg-sky-100 text-sky-700"
          />
        )}
      </div>

      {/* Connection Tables */}
      <FarmsSection title="Owned Farms" farms={user.ownedFarms} />
      <FarmsSection title="Managed Farms" farms={user.managedFarms} />
      <DealerConnectionsSection connections={user.dealerConnections} />
      {user.dealer && <DealerEntitySection dealer={user.dealer} />}
      {user.company && <CompanyEntitySection company={user.company} />}
      <DoctorConversationsSection conversations={user.doctorConversations} />
    </div>
  );
}
