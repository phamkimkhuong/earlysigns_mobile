import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Trash2,
  X,
} from "lucide-react-native";
import { logger, type NetworkLogItem } from "@/core/logger";

const IS_DEV = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";

export default function DevNetworkInspector() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<NetworkLogItem[]>(() => (IS_DEV ? logger.getNetworkLogs() : []));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!IS_DEV) return undefined;
    const unsubscribe = logger.subscribe(() => {
      setLogs(logger.getNetworkLogs());
    });
    return unsubscribe;
  }, []);

  if (!IS_DEV) return null;

  const filteredLogs = logs.filter((log) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      log.url.toLowerCase().includes(term) ||
      log.method.toLowerCase().includes(term) ||
      String(log.status || "").includes(term)
    );
  });

  return (
    <>
      {/* Floating Badge Button in DEV mode */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setOpen(true)}
        className="absolute bottom-20 right-4 z-50 bg-slate-900/95 border border-indigo-500/80 px-3 py-2 rounded-full flex-row items-center gap-1.5 shadow-lg"
        style={{ elevation: 10 }}
      >
        <Activity size={14} color="#818cf8" />
        <Text className="text-white text-xs font-bold">Net</Text>
        <View className="bg-indigo-600 px-1.5 py-0.2 rounded-full">
          <Text className="text-[10px] font-black text-white">{logs.length}</Text>
        </View>
      </TouchableOpacity>

      {/* DevTools Modal */}
      <Modal visible={open} animationType="slide" transparent={false} onRequestClose={() => setOpen(false)}>
        <SafeAreaView className="flex-1 bg-slate-950">
          {/* Top Bar */}
          <View className="p-4 border-b border-slate-800 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-xl bg-indigo-600 items-center justify-center">
                <Activity size={18} color="#ffffff" />
              </View>
              <View>
                <Text className="text-white text-base font-black">DevTools Network</Text>
                <Text className="text-slate-400 text-2xs">{logs.length} captured requests</Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => logger.clearNetworkLogs()}
                className="w-8 h-8 rounded-lg bg-slate-800 items-center justify-center border border-slate-700"
              >
                <Trash2 size={15} color="#f87171" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 items-center justify-center border border-slate-700"
              >
                <X size={18} color="#cbd5e1" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Filter */}
          <View className="p-3 border-b border-slate-800/80">
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Filter by endpoint, method, or status..."
              placeholderTextColor="#64748b"
              className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs"
            />
          </View>

          {/* Request List */}
          <ScrollView className="flex-1 p-3" contentContainerStyle={{ paddingBottom: 40 }}>
            {filteredLogs.length === 0 ? (
              <View className="py-20 items-center justify-center gap-2">
                <Activity size={32} color="#475569" />
                <Text className="text-slate-400 text-xs">No HTTP requests captured yet.</Text>
                <Text className="text-slate-600 text-2xs text-center px-4">
                  Interact with the app (switch tabs, practice video, etc.) to view live requests.
                </Text>
              </View>
            ) : (
              filteredLogs.map((item) => {
                const isExpanded = selectedId === item.id;
                const isSuccess = item.status && item.status >= 200 && item.status < 300;
                const isError = item.state === "error" || (item.status && item.status >= 400);

                const statusColor = isSuccess
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : isError
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                  : "bg-amber-500/20 text-amber-400 border-amber-500/30";

                const methodColor =
                  item.method === "GET"
                    ? "bg-sky-500/20 text-sky-400"
                    : item.method === "POST"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-purple-500/20 text-purple-400";

                return (
                  <View
                    key={item.id}
                    className="mb-2.5 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
                  >
                    {/* Header Row */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setSelectedId(isExpanded ? null : item.id)}
                      className="p-3 flex-row items-center justify-between"
                    >
                      <View className="flex-1 pr-2">
                        <View className="flex-row items-center gap-2 mb-1">
                          <View className={`px-2 py-0.5 rounded-md ${methodColor}`}>
                            <Text className="text-[10px] font-black">{item.method}</Text>
                          </View>
                          <View className={`px-2 py-0.5 rounded-md border ${statusColor}`}>
                            <Text className="text-[10px] font-black">
                              {item.status ? `${item.status}` : item.state}
                            </Text>
                          </View>
                          {item.durationMs != null ? (
                            <Text className="text-slate-400 text-2xs font-semibold">
                              +{item.durationMs}ms
                            </Text>
                          ) : null}
                          <Text className="text-slate-500 text-2xs ml-auto">{item.timestamp}</Text>
                        </View>
                        <Text className="text-white text-xs font-bold" numberOfLines={1}>
                          {item.url.replace(/^https?:\/\/[^/]+/, "")}
                        </Text>
                      </View>
                      {isExpanded ? (
                        <ChevronUp size={16} color="#94a3b8" />
                      ) : (
                        <ChevronDown size={16} color="#94a3b8" />
                      )}
                    </TouchableOpacity>

                    {/* Detailed Accordion View */}
                    {isExpanded ? (
                      <View className="p-3 border-t border-slate-800 bg-slate-950/70 gap-2.5">
                        {/* Full URL */}
                        <View>
                          <Text className="text-slate-400 text-2xs font-bold uppercase tracking-wider mb-0.5">
                            Full URL
                          </Text>
                          <Text className="text-slate-200 text-xs font-mono bg-slate-900 p-2 rounded-lg">
                            {item.url}
                          </Text>
                        </View>

                        {/* Params */}
                        {item.params ? (
                          <View>
                            <Text className="text-slate-400 text-2xs font-bold uppercase tracking-wider mb-0.5">
                              Query Parameters
                            </Text>
                            <Text className="text-slate-300 text-xs font-mono bg-slate-900 p-2 rounded-lg">
                              {JSON.stringify(item.params, null, 2)}
                            </Text>
                          </View>
                        ) : null}

                        {/* Request Headers */}
                        {item.headers ? (
                          <View>
                            <Text className="text-slate-400 text-2xs font-bold uppercase tracking-wider mb-0.5">
                              Sanitized Headers
                            </Text>
                            <Text className="text-slate-300 text-xs font-mono bg-slate-900 p-2 rounded-lg">
                              {JSON.stringify(item.headers, null, 2)}
                            </Text>
                          </View>
                        ) : null}

                        {/* Request Body */}
                        {item.requestBody ? (
                          <View>
                            <Text className="text-slate-400 text-2xs font-bold uppercase tracking-wider mb-0.5">
                              Request Body
                            </Text>
                            <Text className="text-slate-300 text-xs font-mono bg-slate-900 p-2 rounded-lg">
                              {typeof item.requestBody === "object"
                                ? JSON.stringify(item.requestBody, null, 2)
                                : String(item.requestBody)}
                            </Text>
                          </View>
                        ) : null}

                        {/* Response Body */}
                        {item.responseBody != null ? (
                          <View>
                            <Text className="text-emerald-400 text-2xs font-bold uppercase tracking-wider mb-0.5">
                              Response Body ({item.status})
                            </Text>
                            <Text className="text-emerald-200 text-xs font-mono bg-slate-900 p-2 rounded-lg">
                              {typeof item.responseBody === "object"
                                ? JSON.stringify(item.responseBody, null, 2)
                                : String(item.responseBody)}
                            </Text>
                          </View>
                        ) : null}

                        {/* Error */}
                        {item.error ? (
                          <View>
                            <Text className="text-rose-400 text-2xs font-bold uppercase tracking-wider mb-0.5">
                              Error Detail
                            </Text>
                            <Text className="text-rose-300 text-xs font-mono bg-slate-900 p-2 rounded-lg">
                              {typeof item.error === "object"
                                ? JSON.stringify(item.error, null, 2)
                                : String(item.error)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
