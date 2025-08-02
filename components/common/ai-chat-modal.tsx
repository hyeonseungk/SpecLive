"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { showError } from "@/lib/error-store";
import { useT } from "@/lib/i18n";
import { useLangStore } from "@/lib/i18n-store";
import { supabase } from "@/lib/supabase-browser";
import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePrd: (content: string) => void;
}

export default function AiChatModal({
  isOpen,
  onClose,
  onSavePrd,
}: AiChatModalProps) {
  const t = useT();
  const { locale } = useLangStore();
  // 최초 안내 메시지를 현재 언어로 설정
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: t("ai.initial_message") },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // 전송 중 취소 플래그
  const isCancelledRef = useRef(false);

  // 메시지가 추가될 때마다 스크롤을 맨 아래로
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 모달이 열릴 때 입력창에 포커스
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    // 취소 플래그 초기화
    isCancelledRef.current = false;
    setIsLoading(true);

    // 사용자 메시지 + AI placeholder 한 번에 추가
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
      { role: "assistant", content: "" },
    ]);

    try {
      // 스트리밍 시작 표시
      setIsStreaming(true);

      const { data, error } = await supabase.functions.invoke("ai-prd-chat", {
        body: {
          messages: [...messages, { role: "user", content: userMessage }],
          language: locale,
        },
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        // // TS 타입에 아직 반영되지 않았을 수 있음
        // // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // // @ts-ignore
        // noResolveJson: true,
        // signal: abortRef.current.signal
      });

      if (!data?.body) {
        throw new Error(t("ai.invalid_response"));
      }

      const reader = data.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let lastActivity = Date.now();

      // 실시간 업데이트 (부드러운 스트리밍)
      let isUpdateScheduled = false;

      const scheduleUpdate = () => {
        if (!isUpdateScheduled) {
          isUpdateScheduled = true;
          requestAnimationFrame(() => {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: assistantText,
              };
              return updated;
            });
            isUpdateScheduled = false;
          });
        }
      };

      // 연결 상태 모니터링
      const connectionMonitor = setInterval(() => {
        const now = Date.now();
        const timeSinceLastActivity = now - lastActivity;

        // 60초 동안 활동이 없으면 경고 로그
        if (timeSinceLastActivity > 60000) {
          console.warn(
            "Stream seems inactive for",
            Math.floor(timeSinceLastActivity / 1000),
            "seconds"
          );
        }
      }, 10000); // 10초마다 체크

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log("Stream completed normally");
            break;
          }
          if (isCancelledRef.current) {
            console.log("Stream cancelled by user");
            break;
          }

          lastActivity = Date.now();
          const chunk = decoder.decode(value, { stream: true });

          // 스트림 종료 마커 감지
          if (chunk.includes("__STREAM_END__")) {
            console.log("Received stream end marker, completing normally");
            // 마커 제거하고 최종 텍스트만 보관
            assistantText += chunk
              .replace("__STREAM_END__", "")
              .replace(/\n/g, "");
            scheduleUpdate();
            // 클라이언트가 스스로 연결을 끊음
            reader.cancel();
            // 스트림 종료 후 입력창에 포커스
            setTimeout(() => {
              inputRef.current?.focus();
            }, 100);
            break;
          }

          // 연결 중단 메시지 감지
          if (chunk.includes("[Connection interrupted]")) {
            console.warn("Received connection interrupted message");
            showError(t("ai.error_title"), t("common.connection_error"));
            break;
          }

          assistantText += chunk;
          scheduleUpdate();
        }
      } catch (streamError) {
        console.error("Stream reading error:", streamError);
        throw new Error(t("common.streaming_error"));
      } finally {
        clearInterval(connectionMonitor);
      }

      // 루프 종료 후(취소되지 않았다면) 최종 내용 반영
      if (!isCancelledRef.current) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: assistantText,
          };
          return updated;
        });

        // AI 답변 완료 후 입력창에 포커스
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    } catch (error) {
      console.error("AI 채팅 오류:", error);
      const errorMessage =
        error instanceof Error ? error.message : t("common.error_generic");
      showError(t("ai.error_title"), errorMessage);
      // 오류 발생 시 빈 AI 메시지 제거
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  // Shift+Enter는 개행, Enter만 누르면 전송
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 전송 중단 (AI 응답 무시)
  const handleCancel = () => {
    if (!isLoading) return;
    // 취소 플래그 설정
    isCancelledRef.current = true;
    // 마지막 assistant placeholder 제거
    setMessages((prev) => prev.slice(0, -1));
    setIsLoading(false);
    setIsStreaming(false);
  };

  const handleSavePrd = () => {
    // 마지막 AI 메시지(말풍선)만 PRD로 저장
    const lastAssistant = [...messages]
      .reverse()
      .find((msg) => msg.role === "assistant");
    if (!lastAssistant) return;
    const prdContent = lastAssistant.content;
    onSavePrd(prdContent);
    onClose();
  };

  // “그래도 닫기” 클릭 시: 메시지를 초기화하고 모달을 닫음
  const handleConfirmClose = () => {
    setMessages([{ role: "assistant", content: t("ai.initial_message") }]); // 인사 메시지만 유지
    onClose();
  };

  // 대화 초기화: 메시지를 기본 상태로 되돌림
  const handleResetConversation = () => {
    setMessages([{ role: "assistant", content: t("ai.initial_message") }]); // 인사 메시지만 유지
    setInputValue(""); // 입력창도 초기화
    // 입력창에 포커스
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <CardTitle className="text-xl">{t("ai.modal_title")}</CardTitle>
          <div className="flex gap-2">
            {/* PRD 저장 확인 모달 */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={messages.length <= 1}>
                  {t("ai.save_to_prd")}
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("ai.save_confirm_title")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("ai.save_confirm_desc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel>{t("buttons.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSavePrd}>
                    {t("ai.save_to_prd")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* 대화 초기화 확인 모달 */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={messages.length <= 1}>
                  대화 초기화
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>대화 초기화</AlertDialogTitle>
                  <AlertDialogDescription>
                    이때까지의 대화를 초기화하시겠어요?
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetConversation}>
                    초기화
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* 확인 모달 */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (messages.length <= 1) {
                      onClose();
                    }
                  }}
                >
                  {t("ai.close")}
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("ai.close_confirm_title")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("ai.close_confirm_desc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel>{t("buttons.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmClose}>
                    {t("ai.close")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.role === "assistant" &&
                  isStreaming &&
                  index === messages.length - 1 && (
                    <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1"></span>
                  )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력 영역 */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("ai.input_placeholder")}
              disabled={isLoading}
              className="flex-1 h-20 resize-none border rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
            >
              {isLoading ? t("ai.sending") : t("buttons.send")}
            </Button>

            {isLoading && (
              <Button variant="outline" onClick={handleCancel}>
                {t("ai.abort")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
